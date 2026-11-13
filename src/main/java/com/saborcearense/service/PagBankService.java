package com.saborcearense.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.Pedido;

/** Pagamento transparente PagBank (Pix e cartão de crédito) sem sair do site. */
@Service
public class PagBankService {
    public record Cobranca(String pedidoPagBankId, String status, long valorCentavos, String moeda,
            String pixCopiaECola) {}

    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final String token;
    private final String apiUrl;
    private final String publicUrl;
    private final boolean pagamentoAtivo;
    private final String datasourceUrl;
    private volatile String chavePublica;

    public PagBankService(ObjectMapper mapper,
            @Value("${app.pagbank.token:}") String token,
            @Value("${app.pagbank.api-url:https://api.pagseguro.com}") String apiUrl,
            @Value("${app.public-url:http://localhost:8080}") String publicUrl,
            @Value("${app.pagbank.enabled:false}") boolean pagamentoAtivo,
            @Value("${spring.datasource.url:}") String datasourceUrl) {
        this.mapper = mapper;
        this.token = token == null ? "" : token.trim();
        this.apiUrl = apiUrl.replaceAll("/+$", "");
        this.publicUrl = publicUrl.replaceAll("/+$", "");
        this.pagamentoAtivo = pagamentoAtivo;
        this.datasourceUrl = datasourceUrl;
    }

    public boolean habilitado() {
        return pagamentoAtivo && !token.isBlank() && publicUrl.startsWith("https://")
                && (!apiUrl.equals("https://api.pagseguro.com") || datasourceUrl.startsWith("jdbc:postgresql:"));
    }

    /** Chave pública usada pelo navegador para criptografar o cartão. */
    public String chavePublica() {
        if (chavePublica == null) {
            JsonNode json;
            try {
                json = requisitar("GET", "/public-keys/card", null);
            } catch (ResponseStatusException erro) {
                if (erro.getStatusCode().value() != 404 && erro.getStatusCode().value() != 400) throw erro;
                json = requisitar("POST", "/public-keys", Map.of("type", "card"));
            }
            String chave = json.path("public_key").asText("");
            if (chave.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Chave pública indisponível");
            }
            chavePublica = chave;
        }
        return chavePublica;
    }

    public Cobranca cobrarPix(Pedido pedido, String cpf, String email) {
        Map<String, Object> metodo = Map.of("type", "PIX", "pix",
                Map.of("expiration_date", OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30)
                        .withNano(0).toString()));
        return criarPedido(pedido, cpf, email, metodo);
    }

    public Cobranca cobrarCartao(Pedido pedido, String cpf, String email, String cartaoCriptografado,
            String titular) {
        Map<String, Object> metodo = Map.of(
                "type", "CREDIT_CARD",
                "installments", 1,
                "capture", true,
                "card", Map.of("encrypted", cartaoCriptografado, "store", false),
                "holder", Map.of("name", titular, "tax_id", cpf));
        return criarPedido(pedido, cpf, email, metodo);
    }

    private Cobranca criarPedido(Pedido pedido, String cpf, String email, Map<String, Object> metodo) {
        long centavos = pedido.getValorTotal().movePointRight(2).longValueExact();
        Map<String, Object> cliente = new LinkedHashMap<>();
        cliente.put("name", pedido.getClienteNome());
        cliente.put("email", email);
        cliente.put("tax_id", cpf);
        Map<String, String> telefone = telefone(pedido.getTelefone());
        if (telefone != null) {
            cliente.put("phones", List.of(telefone));
        }
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("reference_id", pedido.getPagamentoReferencia());
        corpo.put("customer", cliente);
        corpo.put("items", List.of(Map.of(
                "reference_id", "PEDIDO-" + pedido.getNumeroPedido(),
                "name", "Pedido Sabor Cearense #" + pedido.getNumeroPedido(),
                "quantity", 1,
                "unit_amount", centavos)));
        corpo.put("charges", List.of(Map.of(
                "reference_id", pedido.getPagamentoReferencia(),
                "description", "Sabor Cearense #" + pedido.getNumeroPedido(),
                "amount", Map.of("value", centavos, "currency", "BRL"),
                "payment_method", metodo)));
        corpo.put("notification_urls", List.of(publicUrl + "/api/pagamentos/webhook"));

        JsonNode json = requisitar("POST", "/orders", corpo);
        JsonNode cobranca = json.path("charges").path(0);
        return new Cobranca(json.path("id").asText(), cobranca.path("status").asText(""),
                cobranca.path("amount").path("value").asLong(-1),
                cobranca.path("amount").path("currency").asText(""),
                cobranca.path("qr_code").path("text").asText(null));
    }

    private static Map<String, String> telefone(String bruto) {
        String digitos = bruto == null ? "" : bruto.replaceAll("\\D", "");
        if (digitos.startsWith("55") && digitos.length() > 11) {
            digitos = digitos.substring(2);
        }
        if (digitos.length() != 11) {
            return null;
        }
        return Map.of("country", "55", "area", digitos.substring(0, 2),
                "number", digitos.substring(2), "type", "MOBILE");
    }

    private JsonNode requisitar(String metodo, String caminho, Object corpo) {
        if (!habilitado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Pagamento online indisponível");
        }
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(apiUrl + caminho))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json");
            HttpRequest req = ("GET".equals(metodo)
                    ? builder.GET() : builder.POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(corpo))))
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                System.err.println("PagBank recusou " + caminho + ": " + resp.statusCode());
                HttpStatus status = caminho.equals("/public-keys/card")
                        && (resp.statusCode() == 400 || resp.statusCode() == 404)
                        ? HttpStatus.valueOf(resp.statusCode())
                        : resp.statusCode() == 400 || resp.statusCode() == 422
                            ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY;
                throw new ResponseStatusException(status, "Não foi possível processar o pagamento");
            }
            return mapper.readTree(resp.body());
        } catch (IOException erro) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao contatar o PagBank", erro);
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Falha ao contatar o PagBank", erro);
        }
    }

    /** O PagBank assina a notificação com SHA-256 de "token-corpo" no cabeçalho x-authenticity-token. */
    public boolean assinaturaValida(String corpo, String assinatura) {
        if (token.isBlank() || assinatura == null || assinatura.isBlank()) {
            return false;
        }
        try {
            byte[] esperado = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((token + "-" + corpo).getBytes(StandardCharsets.UTF_8)))
                    .getBytes(StandardCharsets.UTF_8);
            return MessageDigest.isEqual(esperado,
                    assinatura.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
        } catch (java.security.NoSuchAlgorithmException erro) {
            throw new IllegalStateException(erro);
        }
    }
}
