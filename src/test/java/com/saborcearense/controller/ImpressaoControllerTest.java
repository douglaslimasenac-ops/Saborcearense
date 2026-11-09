package com.saborcearense.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.time.Instant;
import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.zip.ZipInputStream;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.repository.DispositivoImpressaoRepository;
import com.saborcearense.security.AdminTokenService;
import com.saborcearense.security.DispositivoImpressaoService;
import com.saborcearense.service.FuncionamentoRestauranteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.core.io.ClassPathResource;
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
    @Autowired private DispositivoImpressaoRepository dispositivos;
    @Autowired private DispositivoImpressaoService vinculacoes;
    private String auth;

    @BeforeEach
    void iniciar() {
        funcionamento.alterar(true);
        auth = "Bearer " + tokens.authenticate("admin", "teste-local");
    }

    @Test
    void codigoExpiraEVincularOutroComputadorRevogaOAnterior() throws Exception {
        String codigoExpirado = vinculacoes.gerarCodigo();
        var registro = dispositivos.findAll().stream()
                .filter(d -> d.getCodigoHash() != null).findFirst().orElseThrow();
        registro.setExpiraEm(Instant.now().minusSeconds(1));
        dispositivos.saveAndFlush(registro);
        mvc.perform(post("/api/impressao/vincular").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(java.util.Map.of("codigo", codigoExpirado))))
                .andExpect(status().isUnauthorized());
        String primeiraCredencial = vinculacoes.vincular(vinculacoes.gerarCodigo());
        String segundaCredencial = vinculacoes.vincular(vinculacoes.gerarCodigo());
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", "Bearer " + primeiraCredencial))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", "Bearer " + segundaCredencial))
                .andExpect(status().isOk());
    }

    @Test
    void instaladorExigeLoginEContemArquivosOriginais() throws Exception {
        mvc.perform(post("/api/admin/impressao/instalador").contentType(MediaType.APPLICATION_JSON)
                .content("{\"site\":\"http://localhost:8080\"}")).andExpect(status().isUnauthorized());
        byte[] zip = mvc.perform(post("/api/admin/impressao/instalador").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"site\":\"http://localhost:8080\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"sabor-cearense-impressao.zip\""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsByteArray();
        var arquivos = new HashMap<String, byte[]>();
        try (ZipInputStream entrada = new ZipInputStream(new ByteArrayInputStream(zip))) {
            java.util.zip.ZipEntry item;
            while ((item = entrada.getNextEntry()) != null) {
                arquivos.put(item.getName(), entrada.readAllBytes());
            }
        }
        assertEquals(9, arquivos.size());
        for (String nome : java.util.List.of("agente.ps1", "interface.ps1", "webview.ps1", "renderizar.ps1",
                "icone.ico", "marca.png", "instalar.cmd", "leia-me.txt")) {
            try (var arquivo = new ClassPathResource("impressao/" + nome).getInputStream()) {
                assertArrayEquals(arquivo.readAllBytes(), arquivos.get(nome));
            }
        }
        var vinculacao = mapper.readTree(arquivos.get("vinculacao.json"));
        assertEquals("http://localhost:8080", vinculacao.get("site").asText());
        String codigo = vinculacao.get("codigo").asText();
        String resposta = mvc.perform(post("/api/impressao/vincular").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(java.util.Map.of("codigo", codigo))))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andReturn().getResponse().getContentAsString();
        String dispositivo = "Bearer " + mapper.readTree(resposta).get("credencial").asText();
        mvc.perform(post("/api/impressao/vincular").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(java.util.Map.of("codigo", codigo))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/impressao/configuracao").header("Authorization", dispositivo)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", dispositivo)).andExpect(status().isOk());
        mvc.perform(post("/api/admin/impressao/999999/confirmar").header("Authorization", dispositivo))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/pedidos").header("Authorization", dispositivo)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/pratos").header("Authorization", dispositivo)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/impressao/instalador").header("Authorization", dispositivo)
                .contentType(MediaType.APPLICATION_JSON).content("{\"site\":\"http://localhost:8080\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/impressao/dispositivos").header("Authorization", dispositivo)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/impressao/dispositivos").header("Authorization", auth)).andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/impressao/pendentes").header("Authorization", dispositivo)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/impressao/instalador").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"site\":\"https://site-invalido.example\"}"))
                .andExpect(status().isBadRequest());
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
