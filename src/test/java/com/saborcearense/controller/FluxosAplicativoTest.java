package com.saborcearense.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.greaterThan;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.config.WebSocketConfig;
import com.saborcearense.repository.FuncionamentoRestauranteRepository;
import com.saborcearense.service.FuncionamentoRestauranteService;
import com.saborcearense.model.FuncionamentoRestaurante;

@SpringBootTest(properties = "app.admin.password=teste-local")
@AutoConfigureMockMvc
@Transactional
class FluxosAplicativoTest {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private FuncionamentoRestauranteService funcionamento;
    @Autowired private FuncionamentoRestauranteRepository funcionamentoRepository;

    @BeforeEach
    void abrirParaTestesDePedidos() {
        funcionamento.alterar(true);
    }

    private static final String PEDIDO = """
            {"clienteNome":"Cliente teste","telefone":"000000001",
             "endereco":"RETIRADA","formaPagamento":"Pix","valorTotal":25,
             "itens":"[{\\"nome\\":\\"Prato\\",\\"quantidade\\":1,\\"preco\\":25}]"}
            """;

    private String login() throws Exception {
        String resposta = mvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"teste-local\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + mapper.readTree(resposta).get("token").asText();
    }

    private MockMultipartFile dadosPedido() {
        return new MockMultipartFile("pedido", "", "application/json",
                PEDIDO.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void novoPedidoEhEnviadoAoPainelEmTempoReal() throws Exception {
        WebSocketSession sessao = mock(WebSocketSession.class);
        when(sessao.isOpen()).thenReturn(true);
        WebSocketConfig.getSessoes().add(sessao);
        try {
            String dados = PEDIDO.replace("\"endereco\":\"RETIRADA\"",
                    "\"endereco\":\"Rua Teste, 123, Bairro: Tijuca\"");
            MockMultipartFile partePedido = new MockMultipartFile("pedido", "", "application/json",
                    dados.getBytes(StandardCharsets.UTF_8));
            String resposta = mvc.perform(multipart("/api/pedidos").file(partePedido))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            JsonNode pedido = mapper.readTree(resposta);

            ArgumentCaptor<TextMessage> mensagem = ArgumentCaptor.forClass(TextMessage.class);
            verify(sessao).sendMessage(mensagem.capture());
            JsonNode notificacao = mapper.readTree(mensagem.getValue().getPayload());
            assertEquals(pedido, notificacao);
            assertEquals("RECEBIDO", notificacao.get("status").asText());
            LocalDateTime.parse(notificacao.get("dataCriacao").asText());
            LocalDateTime.parse(notificacao.get("previsaoEntregaInicio").asText());
            LocalDateTime.parse(notificacao.get("previsaoEntregaFim").asText());
            mvc.perform(get("/api/pedidos/ativos").header("Authorization", login()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == " + pedido.get("id").asLong() + ")]", hasSize(1)));
        } finally {
            WebSocketConfig.getSessoes().remove(sessao);
        }
    }

    @Test
    void previsaoConsideraHorarioDeInicioDasEntregas() {
        assertEquals(LocalDateTime.of(2026, 10, 29, 12, 10),
                PedidoController.calcularInicioPrevisao(LocalDateTime.of(2026, 10, 29, 9, 0)));
        assertEquals(LocalDateTime.of(2026, 10, 29, 12, 10),
                PedidoController.calcularInicioPrevisao(LocalDateTime.of(2026, 10, 29, 11, 30)));
        assertEquals(LocalDateTime.of(2026, 10, 29, 13, 1),
                PedidoController.calcularInicioPrevisao(LocalDateTime.of(2026, 10, 29, 12, 20, 1)));
    }

    @Test
    void previsaoDeEntregaEhCalculadaNoServidorEPersistida() throws Exception {
        LocalDateTime antes = LocalDateTime.now(ZoneId.of("America/Sao_Paulo"));
        String dados = PEDIDO.replace("\"endereco\":\"RETIRADA\"", "\"endereco\":\"Rua Teste, 123, Bairro: Tijuca\"")
                .replace("\"valorTotal\":25", "\"valorTotal\":25,\"previsaoEntregaInicio\":\"2000-01-01T00:00:00\"");
        String resposta = mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(dados))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        LocalDateTime depois = LocalDateTime.now(ZoneId.of("America/Sao_Paulo"));
        JsonNode pedido = mapper.readTree(resposta);
        LocalDateTime inicio = LocalDateTime.parse(pedido.get("previsaoEntregaInicio").asText());
        LocalDateTime fim = LocalDateTime.parse(pedido.get("previsaoEntregaFim").asText());
        assertFalse(inicio.isBefore(PedidoController.calcularInicioPrevisao(antes)));
        assertFalse(inicio.isAfter(PedidoController.calcularInicioPrevisao(depois)));
        assertEquals(inicio.plusMinutes(10), fim);
        mvc.perform(get("/api/pedidos/{id}", pedido.get("id").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previsaoEntregaInicio").value(pedido.get("previsaoEntregaInicio").asText()))
                .andExpect(jsonPath("$.previsaoEntregaFim").value(pedido.get("previsaoEntregaFim").asText()));

        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
                .content(PEDIDO.replace("\"valorTotal\":25", "\"valorTotal\":25,\"previsaoEntregaInicio\":\"2000-01-01T00:00:00\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previsaoEntregaInicio").doesNotExist())
                .andExpect(jsonPath("$.previsaoEntregaFim").doesNotExist());
    }

    @Test
    void loginEConsultasPublicas() throws Exception {
        mvc.perform(post("/api/admin/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"admin\",\"password\":\"incorreta\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/pratos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/armazenamento")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/cardapio")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
        mvc.perform(get("/api/bairros")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$[?(@.nome == 'Vila Isabel' && @.taxa == 6.00)]", hasSize(1)));
        mvc.perform(get("/api/acompanhamentos")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
        mvc.perform(get("/api/admin/pratos").header("Authorization", login()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/armazenamento").header("Authorization", login()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tipo").value("temporario"));
    }

    @Test
    void funcionamentoManualProtegeAlteracaoEBloqueiaNovosPedidos() throws Exception {
        funcionamentoRepository.deleteAll();
        funcionamentoRepository.flush();
        mvc.perform(get("/api/funcionamento")).andExpect(status().isOk())
                .andExpect(jsonPath("$.modo").value("AUTOMATICO"));
        mvc.perform(put("/api/admin/funcionamento").contentType(MediaType.APPLICATION_JSON)
                .content("{\"aberto\":false}")).andExpect(status().isUnauthorized());
        String token = login();
        mvc.perform(put("/api/admin/funcionamento").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/funcionamento").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"aberto\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.aberto").value(false))
                .andExpect(jsonPath("$.modo").value("MANUAL"));
        mvc.perform(get("/api/funcionamento")).andExpect(status().isOk())
                .andExpect(jsonPath("$.aberto").value(false));
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(PEDIDO))
                .andExpect(status().isConflict());
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/admin/funcionamento").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"aberto\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.aberto").value(true));
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(PEDIDO))
                .andExpect(status().isOk());
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()))
                .andExpect(status().isOk());
    }

    @Test
    void pedidosSeguemHorarioAutomaticoNoServidor() throws Exception {
        funcionamentoRepository.deleteAll();
        funcionamentoRepository.flush();
        boolean aberto = mapper.readTree(mvc.perform(get("/api/funcionamento"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.modo").value("AUTOMATICO"))
                .andReturn().getResponse().getContentAsString()).get("aberto").asBoolean();
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(PEDIDO))
                .andExpect(status().is(aberto ? 200 : 409));
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()))
                .andExpect(status().is(aberto ? 200 : 409));
    }

    @Test
    void estadoManualAnteriorRecebePrazoAoSerConsultado() throws Exception {
        funcionamentoRepository.saveAndFlush(new FuncionamentoRestaurante(false, null));
        mvc.perform(get("/api/funcionamento")).andExpect(status().isOk())
                .andExpect(jsonPath("$.modo").value("MANUAL"))
                .andExpect(jsonPath("$.aberto").value(false));
        assertFalse(funcionamentoRepository.findById(1L).orElseThrow().getManualAte() == null);
    }

    @Test
    void administrarBairrosEPratos() throws Exception {
        String token = login();
        String bairro = mvc.perform(post("/api/admin/bairros").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Bairro teste\",\"taxa\":4.50}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long bairroId = mapper.readTree(bairro).get("id").asLong();
        mvc.perform(put("/api/admin/bairros/{id}", bairroId).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Bairro teste\",\"taxa\":6.00}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.taxa").value(6.00));
        mvc.perform(get("/api/bairros")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nome == 'Bairro teste')]", hasSize(1)));
        mvc.perform(delete("/api/admin/bairros/{id}", bairroId).header("Authorization", token))
                .andExpect(status().isNoContent());

        String prato = mvc.perform(post("/api/admin/pratos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Prato teste\",\"categoria\":\"CARNE\",\"preco\":25,\"disponivel\":true}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long pratoId = mapper.readTree(prato).get("id").asLong();
        mvc.perform(put("/api/admin/pratos/{id}", pratoId).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Prato alterado\",\"categoria\":\"CARNE\",\"preco\":30,\"disponivel\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.preco").value(30));
        mvc.perform(get("/api/cardapio")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.nome == 'Prato alterado')]", hasSize(1)));
        mvc.perform(delete("/api/admin/pratos/{id}", pratoId).header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    void imagemDoProdutoEhSalvaAtualizadaEExibidaNoCardapio() throws Exception {
        String token = login();
        String prato = mvc.perform(post("/api/admin/pratos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Produto com imagem\",\"categoria\":\"CARNE\",\"preco\":25,"
                        + "\"disponivel\":true,\"imagemUrl\":\"https://example.com/inicial.png\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imagemUrl").value("https://example.com/inicial.png"))
                .andReturn().getResponse().getContentAsString();
        long pratoId = mapper.readTree(prato).get("id").asLong();

        mvc.perform(put("/api/admin/pratos/{id}", pratoId).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Produto com imagem\",\"categoria\":\"CARNE\",\"preco\":25,"
                        + "\"disponivel\":true,\"imagemUrl\":\"https://example.com/atualizada.png\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imagemUrl").value("https://example.com/atualizada.png"));
        mvc.perform(get("/api/cardapio")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + pratoId + " && @.imagemUrl == 'https://example.com/atualizada.png')]", hasSize(1)));
        mvc.perform(get("/imagens/cardapio/frango-grelhado.webp"))
                .andExpect(status().isOk());
    }

    @Test
    void pedidoSemComprovantePodeSerAcompanhadoEConversar() throws Exception {
        String token = login();
        String resposta = mvc.perform(multipart("/api/pedidos").file(dadosPedido()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comprovantePixDisponivel").value(false))
                .andReturn().getResponse().getContentAsString();
        JsonNode pedido = mapper.readTree(resposta);
        long id = pedido.get("id").asLong();
        long numero = pedido.get("numeroPedido").asLong();
        mvc.perform(get("/api/pedidos/numero/{numero}", numero)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECEBIDO"));
        mvc.perform(get("/api/clientes/000000001")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]", hasSize(1)));
        mvc.perform(post("/api/chat/{numero}", numero).contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensagem\":\"Olá\"}")).andExpect(status().isCreated());
        mvc.perform(post("/api/chat/admin/{numero}", numero).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"mensagem\":\"Olá, cliente\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/chat/{numero}", numero)).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(put("/api/pedidos/{id}/status", id).param("status", "PREPARO")
                .header("Authorization", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PREPARO"));
        mvc.perform(put("/api/pedidos/{id}/status", id).param("status", "ENTREGA")
                .header("Authorization", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENTREGA"));
        mvc.perform(get("/api/pedidos/{id}/comprovante", id).header("Authorization", token))
                .andExpect(status().isNotFound());
    }

    @Test
    void trocoEmDinheiroEhValidadoEPersistido() throws Exception {
        String pedidoDinheiro = PEDIDO.replace("\"formaPagamento\":\"Pix\"", "\"formaPagamento\":\"Dinheiro\"");
        String comTroco = pedidoDinheiro.replace("\"valorTotal\":25", "\"valorTotal\":25,\"trocoPara\":50");
        String resposta = mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(comTroco))
                .andExpect(status().isOk()).andExpect(jsonPath("$.trocoPara").value(50))
                .andReturn().getResponse().getContentAsString();
        long numero = mapper.readTree(resposta).get("numeroPedido").asLong();
        mvc.perform(get("/api/pedidos/numero/{numero}", numero)).andExpect(status().isOk())
                .andExpect(jsonPath("$.trocoPara").value(50));
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
                .content(pedidoDinheiro.replace("\"valorTotal\":25", "\"valorTotal\":25,\"trocoPara\":24.99")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
                .content(PEDIDO.replace("\"valorTotal\":25", "\"valorTotal\":25,\"trocoPara\":50")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
                .content(pedidoDinheiro.replace("\"valorTotal\":25", "\"valorTotal\":25,\"trocoPara\":50.001")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void comprovantePodeSerEnviadoEConsultadoPeloAdmin() throws Exception {
        byte[] conteudo = "%PDF-1.4 teste".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile arquivo = new MockMultipartFile("comprovante", "comprovante.pdf",
                "application/pdf", conteudo);
        String resposta = mvc.perform(multipart("/api/pedidos").file(dadosPedido()).file(arquivo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comprovantePixDisponivel").value(true))
                .andExpect(jsonPath("$.comprovantePix").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(resposta).get("id").asLong();
        mvc.perform(get("/api/pedidos/{id}/comprovante", id)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/pedidos/{id}/comprovante", id).header("Authorization", login()))
                .andExpect(status().isOk()).andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(conteudo));
        MockMultipartFile invalido = new MockMultipartFile("comprovante", "teste.txt",
                "text/plain", "teste".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()).file(invalido))
                .andExpect(status().isBadRequest());
        MockMultipartFile grande = new MockMultipartFile("comprovante", "grande.pdf",
                "application/pdf", new byte[5 * 1024 * 1024 + 1]);
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()).file(grande))
                .andExpect(status().isPayloadTooLarge());
    }

    @ParameterizedTest
    @ValueSource(strings = {"image/jpeg", "image/png", "image/webp", "application/pdf"})
    void formatosDeComprovanteAceitos(String tipo) throws Exception {
        MockMultipartFile arquivo = new MockMultipartFile("comprovante", "comprovante",
                tipo, "arquivo".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()).file(arquivo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comprovantePixDisponivel").value(true));
    }

    @Test
    void comprovanteDeCincoMegabytesEhAceito() throws Exception {
        MockMultipartFile arquivo = new MockMultipartFile("comprovante", "comprovante.pdf",
                "application/pdf", new byte[5 * 1024 * 1024]);
        mvc.perform(multipart("/api/pedidos").file(dadosPedido()).file(arquivo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comprovantePixDisponivel").value(true));
    }
}
