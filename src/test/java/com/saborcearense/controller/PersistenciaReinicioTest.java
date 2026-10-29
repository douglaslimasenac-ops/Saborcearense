package com.saborcearense.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import com.saborcearense.DeliveryApplication;
import com.saborcearense.model.BairroEntrega;
import com.saborcearense.model.Pedido;
import com.saborcearense.model.Produto;
import com.saborcearense.repository.AcompanhamentoRepository;
import com.saborcearense.repository.BairroEntregaRepository;
import com.saborcearense.repository.ItemCardapioRepository;
import com.saborcearense.repository.PedidoRepository;

class PersistenciaReinicioTest {
    @TempDir Path diretorio;

    @Test
    void cadastrosEAlteracoesPersistemAposReiniciarComBancoEmDisco() {
        String url = "jdbc:h2:file:" + diretorio.resolve("teste").toAbsolutePath() + ";MODE=PostgreSQL";
        long pratoId;
        long pedidoId;
        try (ConfigurableApplicationContext contexto = iniciar(url)) {
            BairroEntregaRepository bairros = contexto.getBean(BairroEntregaRepository.class);
            bairros.save(new BairroEntrega("Bairro persistente", new BigDecimal("8.50")));
            bairros.delete(bairros.findByNomeIgnoreCase("Tijuca").orElseThrow());
            Produto prato = new Produto();
            prato.setNome("Prato persistente");
            prato.setCategoria("CARNE");
            prato.setPreco(new BigDecimal("42.00"));
            prato.setDisponivel(true);
            pratoId = contexto.getBean(ItemCardapioRepository.class).save(prato).getId();
            AcompanhamentoRepository acompanhamentos = contexto.getBean(AcompanhamentoRepository.class);
            var acompanhamento = acompanhamentos.findByNomeIgnoreCase("Maionese").orElseThrow();
            acompanhamento.setDisponivel(false);
            acompanhamentos.save(acompanhamento);
            Pedido pedido = new Pedido();
            pedido.setClienteNome("Cliente");
            pedido.setTelefone("000");
            pedido.setEndereco("Rua Teste, 123");
            pedido.setFormaPagamento("Pix");
            pedido.setValorTotal(new BigDecimal("25.00"));
            pedido.setPrevisaoEntregaInicio(LocalDateTime.of(2026, 10, 29, 12, 10));
            pedido.setPrevisaoEntregaFim(LocalDateTime.of(2026, 10, 29, 12, 20));
            pedidoId = contexto.getBean(PedidoRepository.class).save(pedido).getId();
        }
        try (ConfigurableApplicationContext contexto = iniciar(url)) {
            var bairro = contexto.getBean(BairroEntregaRepository.class)
                    .findByNomeIgnoreCase("Bairro persistente").orElseThrow();
            assertEquals(0, bairro.getTaxa().compareTo(new BigDecimal("8.50")));
            assertFalse(contexto.getBean(BairroEntregaRepository.class).findByNomeIgnoreCase("Tijuca").isPresent());
            var prato = contexto.getBean(ItemCardapioRepository.class).findById(pratoId).orElseThrow();
            assertEquals("Prato persistente", prato.getNome());
            assertEquals(0, prato.getPreco().compareTo(new BigDecimal("42.00")));
            assertFalse(contexto.getBean(AcompanhamentoRepository.class)
                    .findByNomeIgnoreCase("Maionese").orElseThrow().isDisponivel());
            Pedido pedido = contexto.getBean(PedidoRepository.class).findById(pedidoId).orElseThrow();
            assertEquals(LocalDateTime.of(2026, 10, 29, 12, 10), pedido.getPrevisaoEntregaInicio());
            assertEquals(LocalDateTime.of(2026, 10, 29, 12, 20), pedido.getPrevisaoEntregaFim());
        }
    }

    @Test
    void cardapioEListaDeBairrosVaziosPermanecemVaziosAposReiniciar() {
        String url = "jdbc:h2:file:" + diretorio.resolve("vazio").toAbsolutePath() + ";MODE=PostgreSQL";
        try (ConfigurableApplicationContext contexto = iniciar(url)) {
            contexto.getBean(ItemCardapioRepository.class).deleteAll();
            contexto.getBean(BairroEntregaRepository.class).deleteAll();
        }
        try (ConfigurableApplicationContext contexto = iniciar(url)) {
            assertEquals(0, contexto.getBean(ItemCardapioRepository.class).count());
            assertEquals(0, contexto.getBean(BairroEntregaRepository.class).count());
        }
    }

    private ConfigurableApplicationContext iniciar(String url) {
        return new SpringApplicationBuilder(DeliveryApplication.class).run(
                "--server.port=0",
                "--spring.datasource.url=" + url,
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
                "--spring.jpa.hibernate.ddl-auto=update",
                "--spring.jpa.show-sql=false");
    }
}
