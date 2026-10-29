package com.saborcearense.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.saborcearense.model.InicializacaoDados;
import com.saborcearense.model.Produto;
import com.saborcearense.repository.InicializacaoDadosRepository;
import com.saborcearense.repository.ItemCardapioRepository;

@Service
public class InicializacaoImagensCardapio {
    private static final String VERSAO = "imagens-cardapio-20261029";
    private static final String DIRETORIO = "/imagens/cardapio/";

    private final ItemCardapioRepository produtos;
    private final InicializacaoDadosRepository inicializacoes;

    public InicializacaoImagensCardapio(ItemCardapioRepository produtos, InicializacaoDadosRepository inicializacoes) {
        this.produtos = produtos;
        this.inicializacoes = inicializacoes;
    }

    @Transactional
    public void inicializar() {
        if (inicializacoes.existsById(VERSAO)) return;

        List<Produto> alterados = new ArrayList<>();
        for (Produto produto : produtos.findAll()) {
            String nomeArquivo = Normalizer.normalize(produto.getNome().trim(), Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("^-|-$", "") + ".webp";
            String urlImagem = DIRETORIO + nomeArquivo;
            if (new ClassPathResource("static" + urlImagem).exists()) {
                produto.setImagemUrl(urlImagem);
                alterados.add(produto);
            }
        }
        produtos.saveAll(alterados);
        inicializacoes.save(new InicializacaoDados(VERSAO));
    }
}
