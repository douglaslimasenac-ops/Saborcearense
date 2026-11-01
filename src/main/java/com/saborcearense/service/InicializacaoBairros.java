package com.saborcearense.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.saborcearense.model.BairroEntrega;
import com.saborcearense.model.InicializacaoDados;
import com.saborcearense.repository.BairroEntregaRepository;
import com.saborcearense.repository.InicializacaoDadosRepository;

@Service
public class InicializacaoBairros {
    private static final String CARGA_INICIAL = "bairros";
    private static final String LISTA_OUTUBRO_2026 = "bairros-lista-20261029";
    private static final String TAXA_VILA_ISABEL = "bairros-vila-isabel-6-reais";
    private static final Map<String, String> TAXAS = Map.ofEntries(
            Map.entry("Andaraí", "5.00"),
            Map.entry("Méier", "3.00"),
            Map.entry("Engenho Novo", "0.00"),
            Map.entry("Todos os Santos", "6.00"),
            Map.entry("Grajaú", "4.00"),
            Map.entry("Encantado", "7.00"),
            Map.entry("Engenho de Dentro", "6.00"),
            Map.entry("Tijuca", "7.00"),
            Map.entry("Sampaio", "3.00"),
            Map.entry("Lins de Vasconcelos", "3.00"),
            Map.entry("Jacaré", "5.00"),
            Map.entry("Mangueira", "6.00"),
            Map.entry("Rocha", "4.00"),
            Map.entry("Cachambi", "5.00"),
            Map.entry("Maracanã", "6.00"),
            Map.entry("Vila Isabel", "6.00"));

    private final BairroEntregaRepository bairros;
    private final InicializacaoDadosRepository inicializacoes;

    public InicializacaoBairros(BairroEntregaRepository bairros, InicializacaoDadosRepository inicializacoes) {
        this.bairros = bairros;
        this.inicializacoes = inicializacoes;
    }

    @Transactional
    public void inicializar() {
        if (!inicializacoes.existsById(CARGA_INICIAL)) {
            inicializacoes.save(new InicializacaoDados(CARGA_INICIAL));
        }
        if (!inicializacoes.existsById(LISTA_OUTUBRO_2026)) {
            atualizarListaInicial();
        }
        if (!inicializacoes.existsById(TAXA_VILA_ISABEL)) {
            atualizarVilaIsabel();
        }
    }

    private void atualizarListaInicial() {
        Map<String, List<BairroEntrega>> existentes = bairros.findAll().stream()
                .collect(Collectors.groupingBy(bairro -> normalizarNome(bairro.getNome())));
        List<BairroEntrega> fatima = existentes.remove(normalizarNome("Fátima"));
        if (fatima != null) bairros.deleteAll(fatima);

        List<BairroEntrega> alterados = new ArrayList<>();
        TAXAS.forEach((nome, valor) -> {
            List<BairroEntrega> encontrados = existentes.get(normalizarNome(nome));
            BigDecimal taxa = new BigDecimal(valor);
            if (encontrados == null) {
                alterados.add(new BairroEntrega(nome, taxa));
            } else {
                encontrados.forEach(bairro -> {
                    bairro.setTaxa(taxa);
                    alterados.add(bairro);
                });
            }
        });
        bairros.saveAll(alterados);
        inicializacoes.save(new InicializacaoDados(LISTA_OUTUBRO_2026));
    }

    private void atualizarVilaIsabel() {
        List<BairroEntrega> encontrados = bairros.findAll().stream()
                .filter(bairro -> normalizarNome(bairro.getNome()).equals(normalizarNome("Vila Isabel")))
                .collect(Collectors.toList());
        if (encontrados.isEmpty()) {
            encontrados.add(new BairroEntrega("Vila Isabel", new BigDecimal("6.00")));
        } else {
            encontrados.forEach(bairro -> bairro.setTaxa(new BigDecimal("6.00")));
        }
        bairros.saveAll(encontrados);
        inicializacoes.save(new InicializacaoDados(TAXA_VILA_ISABEL));
    }

    private static String normalizarNome(String nome) {
        return Normalizer.normalize(nome.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }
}
