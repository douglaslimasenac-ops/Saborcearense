package com.saborcearense.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.Pedido;
import com.saborcearense.model.Produto;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.repository.ItemCardapioRepository;
import com.saborcearense.service.FuncionamentoRestauranteService;
import com.saborcearense.service.NovoPedidoNotificador;
import com.saborcearense.service.PagBankService;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:pagamento_fluxo;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "app.admin.password=teste-local"
})
@AutoConfigureMockMvc
class PagamentoFluxoTest {
    private static final String TOKEN = "segredo-do-pedido";
    private static final String PIX = "{\"cpf\":\"12345678909\",\"email\":\"cliente@example.com\"}";
    private static final String CARTAO = "{\"cpf\":\"12345678909\",\"email\":\"cliente@example.com\","
            + "\"titular\":\"Cliente Teste\",\"cartao\":\"cartao-criptografado\"}";
    @Autowired MockMvc mvc;
    @Autowired PedidoRepository pedidos;
    @Autowired ObjectMapper mapper;
    @Autowired ItemCardapioRepository produtos;
    @Autowired FuncionamentoRestauranteService funcionamento;
    @MockBean PagBankService pagBank;
    @MockBean NovoPedidoNotificador notificador;

    @BeforeEach
    void preparar() {
        pedidos.deleteAll();
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(9999L);
        pedido.setClienteNome("Cliente Teste");
        pedido.setTelefone("11999999999");
        pedido.setEndereco("RETIRADA");
        pedido.setFormaPagamento("Online");
        pedido.setValorTotal(new BigDecimal("25.00"));
        pedido.setStatus("AGUARDANDO_PAGAMENTO");
        pedido.setPagamentoStatus("PENDENTE");
        pedido.setPagamentoToken(TOKEN);
        pedidos.saveAndFlush(pedido);
        when(pagBank.habilitado()).thenReturn(true);
    }

    private int pagar(String metodo, String token, String corpo) throws Exception {
        var req = post("/api/pagamentos/9999/" + metodo).contentType(MediaType.APPLICATION_JSON).content(corpo);
        if (token != null) req.header("X-Pagamento-Token", token);
        return mvc.perform(req).andReturn().getResponse().getStatus();
    }

    @Test
    void tokenIncorretoNaoIniciaCobranca() throws Exception {
        assertEquals(403, pagar("cartao", "outro", CARTAO));
        verify(pagBank, never()).cobrarCartao(any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void respostaIncertaNaoPermiteNovaCobranca() throws Exception {
        when(pagBank.cobrarCartao(any(), anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha"));
        assertEquals(502, pagar("cartao", TOKEN, CARTAO));
        assertEquals(409, pagar("cartao", TOKEN, CARTAO));
        assertEquals("PROCESSANDO", pedidos.findByNumeroPedido(9999L).orElseThrow().getPagamentoStatus());
        verify(pagBank, times(1)).cobrarCartao(any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void soUmaRequisicaoConcorrenteEnviaAoPagbank() throws Exception {
        CountDownLatch iniciou = new CountDownLatch(1);
        CountDownLatch liberar = new CountDownLatch(1);
        when(pagBank.cobrarCartao(any(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(invocacao -> {
                    iniciou.countDown();
                    if (!liberar.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Tempo esgotado");
                    return new PagBankService.Cobranca("ORDE_1", "PAID", 2500, "BRL", null);
                });
        var executor = Executors.newSingleThreadExecutor();
        try {
            var primeira = executor.submit(() -> pagar("cartao", TOKEN, CARTAO));
            if (!iniciou.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Cobrança não iniciou");
            assertEquals(409, pagar("cartao", TOKEN, CARTAO));
            liberar.countDown();
            assertEquals(200, primeira.get(10, TimeUnit.SECONDS));
            verify(pagBank, times(1)).cobrarCartao(any(), anyString(), anyString(), anyString(), anyString());
            assertEquals("PAGO", pedidos.findByNumeroPedido(9999L).orElseThrow().getPagamentoStatus());
        } finally {
            liberar.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void pixReutilizaCodigoEBloqueiaOutroMetodo() throws Exception {
        when(pagBank.cobrarPix(any(), anyString(), anyString()))
                .thenReturn(new PagBankService.Cobranca("ORDE_1", "WAITING", 2500, "BRL", "codigo-pix"));
        assertEquals(200, pagar("pix", TOKEN, PIX));
        assertEquals(200, pagar("pix", TOKEN, PIX));
        assertEquals(409, pagar("cartao", TOKEN, CARTAO));
        verify(pagBank, times(1)).cobrarPix(any(), anyString(), anyString());
    }

    @Test
    void valorDivergenteNaoConfirmaPedido() throws Exception {
        when(pagBank.cobrarCartao(any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new PagBankService.Cobranca("ORDE_1", "PAID", 100, "BRL", null));
        assertEquals(409, pagar("cartao", TOKEN, CARTAO));
        Pedido pedido = pedidos.findByNumeroPedido(9999L).orElseThrow();
        assertEquals("VALOR_DIVERGENTE", pedido.getPagamentoStatus());
        assertEquals("AGUARDANDO_PAGAMENTO", pedido.getStatus());
        verify(notificador, never()).notificar(any());
    }

    @Test
    void webhookValidoConfirmaApenasACobrancaCorretaUmaVez() throws Exception {
        when(pagBank.cobrarPix(any(), anyString(), anyString()))
                .thenReturn(new PagBankService.Cobranca("ORDE_1", "WAITING", 2500, "BRL", "codigo-pix"));
        when(pagBank.assinaturaValida(anyString(), anyString())).thenReturn(true);
        assertEquals(200, pagar("pix", TOKEN, PIX));
        String referencia = pedidos.findByNumeroPedido(9999L).orElseThrow().getPagamentoReferencia();
        String corpo = mapper.writeValueAsString(java.util.Map.of("id", "ORDE_1", "reference_id", referencia,
                "charges", java.util.List.of(java.util.Map.of("status", "PAID",
                        "amount", java.util.Map.of("value", 2500, "currency", "BRL")))));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/pagamentos/webhook").contentType(MediaType.APPLICATION_JSON)
                    .header("x-authenticity-token", "assinatura").content(corpo)).andExpect(status().isOk());
        }
        assertEquals("PAGO", pedidos.findByNumeroPedido(9999L).orElseThrow().getPagamentoStatus());
        verify(notificador, times(1)).notificar(any());
    }

    @Test
    void pendentesExigemAdministradorENaoPermitemForcarPreparo() throws Exception {
        mvc.perform(get("/api/pedidos/pagamentos-pendentes")).andExpect(status().isUnauthorized());
        String login = mvc.perform(post("/api/admin/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"teste-local\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String autenticacao = "Bearer " + mapper.readTree(login).path("token").asText();
        String lista = mvc.perform(get("/api/pedidos/pagamentos-pendentes").header("Authorization", autenticacao))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(9999, mapper.readTree(lista).get(0).path("numeroPedido").asInt());
        assertEquals(false, mapper.readTree(lista).get(0).has("pagamentoToken"));
        Long id = pedidos.findByNumeroPedido(9999L).orElseThrow().getId();
        mvc.perform(put("/api/pedidos/{id}/status", id).param("status", "PREPARO")
                .header("Authorization", autenticacao)).andExpect(status().isConflict());
    }

    @Test
    void webhookComAssinaturaInvalidaNaoConfirma() throws Exception {
        when(pagBank.assinaturaValida(anyString(), anyString())).thenReturn(false);
        mvc.perform(post("/api/pagamentos/webhook").contentType(MediaType.APPLICATION_JSON)
                .header("x-authenticity-token", "invalida").content("{}")).andExpect(status().isUnauthorized());
        assertEquals("PENDENTE", pedidos.findByNumeroPedido(9999L).orElseThrow().getPagamentoStatus());
    }

    @Test
    void criacaoRetornaCredencialUmaVezSemExporNaConsultaPublica() throws Exception {
        funcionamento.alterar(true);
        Produto produto = new Produto();
        produto.setNome("Prato teste pagamento");
        produto.setCategoria("FRANGO");
        produto.setPreco(new BigDecimal("25.00"));
        produto = produtos.saveAndFlush(produto);
        String itens = mapper.writeValueAsString(java.util.List.of(java.util.Map.of(
                "id", produto.getId(), "nome", produto.getNome(), "quantidade", 1, "preco", 25)));
        String corpo = mapper.writeValueAsString(java.util.Map.of(
                "clienteNome", "Cliente Teste", "telefone", "11999999999", "endereco", "RETIRADA",
                "formaPagamento", "Online", "valorTotal", 25, "itens", itens));
        String resposta = mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var pedido = mapper.readTree(resposta);
        assertEquals(36, pedido.path("pagamentoToken").asText().length());
        String consulta = mvc.perform(get("/api/pedidos/numero/{numero}", pedido.path("numeroPedido").asLong()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(false, mapper.readTree(consulta).has("pagamentoToken"));
        assertEquals(false, mapper.readTree(consulta).has("pagamentoReferencia"));
    }
}
