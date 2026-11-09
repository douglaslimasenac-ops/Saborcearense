package com.saborcearense.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.security.AdminTokenService;
import com.saborcearense.service.FuncionamentoRestauranteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "app.admin.password=teste-local",
        "app.impressao-automatica.enabled=true"
})
@AutoConfigureMockMvc
@Transactional
class ImpressaoControllerTest {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private AdminTokenService tokens;
    @Autowired private FuncionamentoRestauranteService funcionamento;
    @Autowired private PedidoRepository pedidos;
    private String auth;

    @BeforeEach
    void iniciar() {
        funcionamento.alterar(true);
        auth = "Bearer " + tokens.authenticate("admin", "teste-local");
    }

    @Test
    void filaProtegidaSobreviveFinalizacaoELimpezaEAConfirmacaoEhIdempotente() throws Exception {
        mvc.perform(get("/api/admin/impressao/pendentes")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/impressao/1/confirmar")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/impressao/configuracao").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.habilitada").value(true));

        String conteudo = """
                {"clienteNome":"Cliente","telefone":"123","endereco":"RETIRADA",
                "formaPagamento":"Pix","valorTotal":25,
                "itens":"[{\\"nome\\":\\"Prato\\",\\"quantidade\\":1,\\"preco\\":25}]",
                "impressaoPendente":false}
                """;
        String resposta = mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(conteudo))
                .andExpect(status().isOk()).andExpect(jsonPath("$.impressaoPendente").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(resposta).get("id").asLong();
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + id + ")]", hasSize(1)));
        mvc.perform(put("/api/pedidos/{id}/status", id).param("status", "ENTREGUE").header("Authorization", auth))
                .andExpect(status().isOk());
        var pedido = pedidos.findById(id).orElseThrow();
        pedido.setDataCriacao(LocalDateTime.now().minusDays(3));
        pedidos.saveAndFlush(pedido);
        mvc.perform(delete("/api/pedidos/historico-antigo").header("Authorization", auth))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + id + ")]", hasSize(1)));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/admin/impressao/{id}/confirmar", id).header("Authorization", auth))
                    .andExpect(status().isNoContent());
        }
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + id + ")]", hasSize(0)));
        mvc.perform(delete("/api/pedidos/historico-antigo").header("Authorization", auth))
                .andExpect(status().isOk());
        mvc.perform(post("/api/admin/impressao/{id}/confirmar", id).header("Authorization", auth))
                .andExpect(status().isNotFound());
    }
}
