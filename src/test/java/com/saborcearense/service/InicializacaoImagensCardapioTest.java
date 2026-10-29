package com.saborcearense.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.annotation.Transactional;

import com.saborcearense.model.Produto;
import com.saborcearense.repository.InicializacaoDadosRepository;
import com.saborcearense.repository.ItemCardapioRepository;

@SpringBootTest
@Transactional
class InicializacaoImagensCardapioTest {
    @Autowired private ItemCardapioRepository produtos;
    @Autowired private InicializacaoDadosRepository inicializacoes;
    @Autowired private InicializacaoImagensCardapio imagens;

    @Test
    void imagensCobremCardapioInicialESaoServidasComoArquivos() {
        var cardapio = produtos.findAll();
        assertEquals(52, cardapio.size());
        assertEquals(52, cardapio.stream().map(Produto::getImagemUrl).distinct().count());
        cardapio.forEach(produto -> {
            assertTrue(produto.getImagemUrl().startsWith("/imagens/cardapio/"), produto.getNome());
            assertTrue(new ClassPathResource("static" + produto.getImagemUrl()).exists(), produto.getNome());
        });
    }

    @Test
    void atualizacaoAconteceUmaVezEPreservaProdutosNaoMapeadosEEdicoesPosteriores() {
        Produto frango = produtos.findAll().stream()
                .filter(produto -> produto.getNome().equals("Frango Grelhado")).findFirst().orElseThrow();
        frango.setImagemUrl("https://example.com/anterior.png");
        produtos.save(frango);

        Produto outro = new Produto();
        outro.setNome("Produto especial");
        outro.setCategoria("CARNE");
        outro.setPreco(new BigDecimal("25.00"));
        outro.setImagemUrl("https://example.com/especial.png");
        outro = produtos.save(outro);

        inicializacoes.deleteById("imagens-cardapio-20261029");
        imagens.inicializar();
        assertEquals("/imagens/cardapio/frango-grelhado.webp", produtos.findById(frango.getId()).orElseThrow().getImagemUrl());
        assertEquals("https://example.com/especial.png", produtos.findById(outro.getId()).orElseThrow().getImagemUrl());

        frango.setImagemUrl("https://example.com/nova.png");
        produtos.save(frango);
        imagens.inicializar();
        assertEquals("https://example.com/nova.png", produtos.findById(frango.getId()).orElseThrow().getImagemUrl());
    }
}
