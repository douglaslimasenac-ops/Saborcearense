package com.saborcearense.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.saborcearense.model.Pedido;
import com.saborcearense.repository.ChatMensagemRepository;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.security.AdminTokenService;

@SpringBootTest(properties = "app.admin.password=teste-local")
@AutoConfigureMockMvc
class PedidoChatFinalizacaoTest {
    @Autowired private MockMvc mvc;
    @Autowired private PedidoRepository pedidos;
    @Autowired private ChatMensagemRepository mensagens;
    @Autowired private AdminTokenService tokens;

    @ParameterizedTest
    @ValueSource(strings = {"ENTREGUE", "CANCELADO"})
    void finalizarRemovePedidoAtivoEEncerraConversa(String statusFinal) throws Exception {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ENTREGUE".equals(statusFinal) ? 7651L : 7652L);
        pedido.setClienteNome("Cliente teste");
        pedido.setTelefone("000000000");
        pedido.setEndereco("RETIRADA");
        pedido.setFormaPagamento("Pix");
        pedido.setValorTotal(BigDecimal.TEN);
        pedido.setItens("[]");
        pedido = pedidos.save(pedido);
        String token = "Bearer " + tokens.authenticate("admin", "teste-local");
        String chat = "/api/chat/" + pedido.getNumeroPedido();

        mvc.perform(post(chat).contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensagem\":\"Olá\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/pedidos/ativos").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + pedido.getId() + ")]", hasSize(1)));
        mvc.perform(put("/api/pedidos/{id}/status", pedido.getId())
                .param("status", statusFinal).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(statusFinal));
        mvc.perform(get("/api/pedidos/ativos").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + pedido.getId() + ")]", hasSize(0)));
        mvc.perform(get("/api/pedidos").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + pedido.getId() + " && @.status == '" + statusFinal + "')]", hasSize(1)));
        org.junit.jupiter.api.Assertions.assertTrue(
                mensagens.findByNumeroPedidoOrderByDataCriacaoAsc(pedido.getNumeroPedido()).isEmpty());
        mvc.perform(get(chat)).andExpect(status().isGone());
        mvc.perform(post(chat).contentType(MediaType.APPLICATION_JSON)
                .content("{\"mensagem\":\"Outra mensagem\"}"))
                .andExpect(status().isGone());
    }
}
