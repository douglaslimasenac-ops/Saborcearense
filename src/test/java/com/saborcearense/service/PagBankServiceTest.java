package com.saborcearense.service;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.Pedido;
import com.sun.net.httpserver.HttpServer;

class PagBankServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private HttpServer server;
    private PagBankService service;

    @BeforeEach
    void iniciar() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        service = new PagBankService(mapper, "token-teste",
                "http://127.0.0.1:" + server.getAddress().getPort(), "https://example.test", true, "jdbc:h2:mem:test");
    }

    @AfterEach
    void parar() {
        server.stop(0);
    }

    @Test
    void criaPixNoFormatoDocumentadoELeCodigoDaCobranca() throws Exception {
        AtomicReference<JsonNode> enviado = new AtomicReference<>();
        server.createContext("/orders", exchange -> {
            enviado.set(mapper.readTree(exchange.getRequestBody()));
            byte[] resposta = ("{\"id\":\"ORDE_1\",\"charges\":[{\"status\":\"WAITING\","
                    + "\"amount\":{\"value\":2500,\"currency\":\"BRL\"},"
                    + "\"qr_code\":{\"text\":\"codigo-pix\"}}]}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(201, resposta.length);
            exchange.getResponseBody().write(resposta);
            exchange.close();
        });
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(1234L);
        pedido.setPagamentoReferencia("a3e4563d-11e7-459e-b095-06fd59971b3c");
        pedido.setClienteNome("Cliente Teste");
        pedido.setTelefone("11999999999");
        pedido.setValorTotal(new BigDecimal("25.00"));
        var cobranca = service.cobrarPix(pedido, "12345678909", "cliente@example.com");
        assertEquals("codigo-pix", cobranca.pixCopiaECola());
        assertEquals("BRL", cobranca.moeda());
        assertEquals(pedido.getPagamentoReferencia(), enviado.get().path("reference_id").asText());
        assertEquals("PIX", enviado.get().path("charges").path(0).path("payment_method").path("type").asText());
        assertEquals(2500, enviado.get().path("charges").path(0).path("amount").path("value").asInt());
        assertEquals("https://example.test/api/pagamentos/webhook",
                enviado.get().path("notification_urls").path(0).asText());
    }

    @Test
    void consultaChaveExistenteSemCriarOutra() {
        server.createContext("/public-keys/card", exchange -> {
            byte[] resposta = "{\"public_key\":\"chave-existente\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, resposta.length);
            exchange.getResponseBody().write(resposta);
            exchange.close();
        });
        assertEquals("chave-existente", service.chavePublica());
    }

    @Test
    void validaAssinaturaSemAlterarCorpo() throws Exception {
        String corpo = "{\"status\":\"PAID\"}";
        String assinatura = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(("token-teste-" + corpo).getBytes(StandardCharsets.UTF_8)));
        assertTrue(service.assinaturaValida(corpo, assinatura));
        assertFalse(service.assinaturaValida(corpo + " ", assinatura));
        assertFalse(service.assinaturaValida(corpo, "assinatura-invalida"));
    }

    @Test
    void producaoNaoAtivaComBancoEmMemoria() {
        var producao = new PagBankService(mapper, "token-teste", "https://api.pagseguro.com",
                "https://example.test", true, "jdbc:h2:mem:test");
        assertFalse(producao.habilitado());
    }
}
