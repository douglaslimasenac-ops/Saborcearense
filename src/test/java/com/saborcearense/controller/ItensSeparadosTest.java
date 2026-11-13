package com.saborcearense.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.BairroEntrega;
import com.saborcearense.model.Produto;
import com.saborcearense.model.Pedido;
import com.saborcearense.repository.BairroEntregaRepository;
import com.saborcearense.repository.ItemCardapioRepository;
import com.saborcearense.service.FuncionamentoRestauranteService;
import com.saborcearense.service.ValidacaoItensSeparadosService;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ItensSeparadosTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ItemCardapioRepository produtos;
    @Autowired BairroEntregaRepository bairros;
    @Autowired FuncionamentoRestauranteService funcionamento;
    @Autowired ValidacaoItensSeparadosService validacao;
    private Produto produto;

    @BeforeEach
    void preparar() {
        funcionamento.alterar(true);
        produto = new Produto();
        produto.setNome("Prato teste");
        produto.setCategoria("FRANGO");
        produto.setPreco(new BigDecimal("20.00"));
        produto = produtos.saveAndFlush(produto);
        bairros.saveAndFlush(new BairroEntrega("Bairro teste separados", new BigDecimal("5.00")));
    }

    private Map<String, Object> pedido() throws Exception {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", produto.getId() + "-separado-teste");
        item.put("nome", "Prato teste (Maionese) — SEPARADO: Arroz, Maionese");
        item.put("quantidade", 2);
        item.put("preco", 24);
        item.put("itensSeparados", List.of("Arroz", "Maionese"));
        item.put("adicionalSeparados", 0);
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("clienteNome", "Cliente teste");
        dados.put("telefone", "123456789");
        dados.put("endereco", "Rua teste, Bairro: Bairro teste separados (Ref: porta)");
        dados.put("bairroEntrega", "Bairro teste separados");
        dados.put("formaPagamento", "Pix");
        dados.put("valorTotal", 53);
        dados.put("itens", mapper.writeValueAsString(List.of(item)));
        return dados;
    }

    private String enviar(Map<String, Object> dados, int esperado) throws Exception {
        return mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(dados)))
                .andExpect(status().is(esperado)).andReturn().getResponse().getContentAsString();
    }

    @Test
    void calculaPorItemEQuantidadeComEntregaEPersisteParaConsulta() throws Exception {
        var resposta = mapper.readTree(enviar(pedido(), 200));
        assertEquals(0, resposta.get("valorTotal").decimalValue().compareTo(new BigDecimal("53.00")));
        var item = mapper.readTree(resposta.get("itens").asText()).get(0);
        assertEquals("Arroz", item.get("itensSeparados").get(0).asText());
        assertEquals("Maionese", item.get("itensSeparados").get(1).asText());
        assertEquals(0, item.get("preco").decimalValue().compareTo(new BigDecimal("24.00")));
        assertEquals(0, item.get("adicionalSeparados").decimalValue().compareTo(new BigDecimal("4.00")));
        mvc.perform(get("/api/pedidos/numero/{numero}", resposta.get("numeroPedido").asLong()))
                .andExpect(status().isOk());
    }

    @Test
    void rejeitaValoresManipuladosEItensInvalidos() throws Exception {
        Map<String, Object> dados = pedido();
        dados.put("valorTotal", 49);
        enviar(dados, 400);
        dados = pedido();
        dados.put("bairroEntrega", "outro bairro");
        enviar(dados, 400);
        dados = pedido();
        dados.put("itens", ((String) dados.get("itens")).replace("\"preco\":24", "\"preco\":20"));
        enviar(dados, 400);
        dados = pedido();
        dados.put("itens", ((String) dados.get("itens")).replace("\"Arroz\",\"Maionese\"", "\"Arroz\",\"Arroz\""));
        enviar(dados, 400);
        dados = pedido();
        dados.put("itens", ((String) dados.get("itens")).replace("\"itensSeparados\":[\"Arroz\",\"Maionese\"]", "\"itensSeparados\":[]"));
        enviar(dados, 400);
    }

    @Test
    void retiradaNaoIncluiTaxa() throws Exception {
        Map<String, Object> dados = pedido();
        dados.put("endereco", "RETIRADA NO ESTABELECIMENTO");
        dados.put("valorTotal", 48);
        enviar(dados, 200);
    }

    @Test
    void somaOutrosProdutosSemConfundirAdicionalComEntrega() throws Exception {
        Produto bebida = new Produto();
        bebida.setNome("Bebida teste");
        bebida.setCategoria("BEBIDA");
        bebida.setPreco(new BigDecimal("6.00"));
        bebida = produtos.saveAndFlush(bebida);
        Map<String, Object> dados = pedido();
        var lista = (com.fasterxml.jackson.databind.node.ArrayNode) mapper.readTree((String) dados.get("itens"));
        var item = lista.addObject();
        item.put("id", bebida.getId());
        item.put("nome", bebida.getNome());
        item.put("quantidade", 1);
        item.put("preco", 6);
        dados.put("itens", mapper.writeValueAsString(lista));
        dados.put("valorTotal", 59);
        enviar(dados, 200);
        dados.put("valorTotal", 57);
        enviar(dados, 400);
    }

    @Test
    void pagamentoOnlineConferePrecosMesmoSemItensSeparados() throws Exception {
        Map<String, Object> dados = pedido();
        dados.put("formaPagamento", "Online");
        dados.put("itens", mapper.writeValueAsString(List.of(Map.of(
                "id", produto.getId(), "nome", produto.getNome(), "quantidade", 2, "preco", 20))));
        dados.put("valorTotal", 45);
        validacao.validar(mapper.convertValue(dados, Pedido.class));
        dados.put("valorTotal", 1);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> validacao.validar(mapper.convertValue(dados, Pedido.class)));
        dados.put("itens", "[]");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> validacao.validar(mapper.convertValue(dados, Pedido.class)));
    }
}
