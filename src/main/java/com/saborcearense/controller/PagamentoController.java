package com.saborcearense.controller;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.service.NovoPedidoNotificador;
import com.saborcearense.service.PagBankService;

@RestController
@RequestMapping("/api/pagamentos")
public class PagamentoController {
    public record DadosPix(String cpf, String email) {}
    public record DadosCartao(String cpf, String email, String titular, String cartao) {}

    @GetMapping("/disponibilidade")
    public Map<String, Boolean> disponibilidade() {
        return Map.of("disponivel", pagBank.habilitado());
    }

    @Autowired
    private PagBankService pagBank;
    @Autowired
    private PedidoRepository pedidos;
    @Autowired
    private NovoPedidoNotificador notificador;
    @Autowired
    private ObjectMapper mapper;
    @Autowired
    private TransactionTemplate transacao;
    @Value("${app.impressao-automatica.enabled:false}")
    private boolean impressaoAutomatica;

    @GetMapping("/chave-publica")
    public Map<String, String> chavePublica() {
        return Map.of("chave", pagBank.chavePublica());
    }

    @PostMapping("/{numero}/pix")
    public Map<String, String> pagarComPix(@PathVariable Long numero, @RequestBody DadosPix dados,
            @RequestHeader(value = "X-Pagamento-Token", required = false) String token) {
        validarContato(dados.cpf(), dados.email());
        Pedido pedido = iniciar(numero, token, true);
        String copiaECola = pedido.getPixCopiaECola();
        if (copiaECola == null || copiaECola.isBlank()) {
            PagBankService.Cobranca cobranca = pagBank.cobrarPix(pedido, apenasDigitos(dados.cpf()),
                    dados.email().trim());
            pedido = aplicarCobranca(pedido.getPagamentoReferencia(), cobranca);
            if ("PAGO".equals(pedido.getPagamentoStatus())) return Map.of("status", "PAGO");
            copiaECola = pedido.getPixCopiaECola();
        }
        if (!"PENDENTE_PIX".equals(pedido.getPagamentoStatus()) || copiaECola == null || copiaECola.isBlank()) {
            throw situacaoPagamento(pedido);
        }
        return Map.of("copiaECola", copiaECola, "qrCode", qrCodeBase64(copiaECola));
    }

    @PostMapping("/{numero}/cartao")
    public Map<String, String> pagarComCartao(@PathVariable Long numero, @RequestBody DadosCartao dados,
            @RequestHeader(value = "X-Pagamento-Token", required = false) String token) {
        validarContato(dados.cpf(), dados.email());
        if (dados.cartao() == null || dados.cartao().isBlank() || dados.titular() == null
                || dados.titular().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados do cartão inválidos");
        }
        Pedido pedido = iniciar(numero, token, false);
        PagBankService.Cobranca cobranca = pagBank.cobrarCartao(pedido, apenasDigitos(dados.cpf()),
                dados.email().trim(), dados.cartao(), dados.titular().trim());
        pedido = aplicarCobranca(pedido.getPagamentoReferencia(), cobranca);
        if (!"PAGO".equals(pedido.getPagamentoStatus())) throw situacaoPagamento(pedido);
        return Map.of("status", "PAGO");
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> receberNotificacao(@RequestBody String corpo,
            @RequestHeader(value = "x-authenticity-token", required = false) String assinatura) throws Exception {
        if (!pagBank.assinaturaValida(corpo, assinatura)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        JsonNode json = mapper.readTree(corpo);
        JsonNode cobranca = json.path("charges").path(0);
        String referencia = json.path("reference_id").asText("");
        if (!referencia.matches("[0-9a-fA-F-]{36}") || cobranca.path("status").asText("").isBlank()
                || json.path("id").asText("").isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        aplicarCobranca(referencia, new PagBankService.Cobranca(json.path("id").asText(),
                cobranca.path("status").asText(), cobranca.path("amount").path("value").asLong(-1),
                cobranca.path("amount").path("currency").asText(""),
                cobranca.path("qr_code").path("text").asText(null)));
        return ResponseEntity.ok().build();
    }

    private Pedido aplicarCobranca(String referencia, PagBankService.Cobranca cobranca) {
        boolean[] confirmado = {false};
        Pedido atualizado = transacao.execute(t -> {
            Pedido pedido = pedidos.findByPagamentoReferenciaForUpdate(referencia)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cobrança não encontrada"));
            if (cobranca.pedidoPagBankId().isBlank()
                    || (pedido.getPagbankPedidoId() != null
                        && !pedido.getPagbankPedidoId().equals(cobranca.pedidoPagBankId()))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cobrança divergente");
            }
            if (!"AGUARDANDO_PAGAMENTO".equals(pedido.getStatus())) return pedido;
            pedido.setPagbankPedidoId(cobranca.pedidoPagBankId());
            if (cobranca.valorCentavos() != pedido.getValorTotal().movePointRight(2).longValueExact()
                    || !"BRL".equals(cobranca.moeda())) {
                System.err.println("Pagamento com valor ou moeda divergente. Pedido #" + pedido.getNumeroPedido());
                pedido.setPagamentoStatus("VALOR_DIVERGENTE");
            } else if ("PAID".equalsIgnoreCase(cobranca.status())) {
                pedido.setPagamentoStatus("PAGO");
                pedido.setStatus("RECEBIDO");
                pedido.setImpressaoPendente(impressaoAutomatica);
                confirmado[0] = true;
            } else if ("DECLINED".equalsIgnoreCase(cobranca.status())
                    || "CANCELED".equalsIgnoreCase(cobranca.status())) {
                pedido.setPagamentoStatus("RECUSADO");
                pedido.setPixCopiaECola(null);
            } else if ("WAITING".equalsIgnoreCase(cobranca.status())
                    && cobranca.pixCopiaECola() != null && !cobranca.pixCopiaECola().isBlank()) {
                pedido.setPagamentoStatus("PENDENTE_PIX");
                pedido.setPixCopiaECola(cobranca.pixCopiaECola());
            } else if (!"PENDENTE_PIX".equals(pedido.getPagamentoStatus())) {
                pedido.setPagamentoStatus("EM_ANALISE");
            }
            return pedidos.save(pedido);
        });
        if (confirmado[0]) {
            notificador.notificar(atualizado);
        }
        return atualizado;
    }

    private Pedido iniciar(Long numero, String token, boolean pix) {
        if (!pagBank.habilitado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Pagamento online indisponível");
        }
        return transacao.execute(t -> {
            Pedido pedido = pedidos.findByNumeroPedidoForUpdate(numero)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido não encontrado"));
            if (token == null || pedido.getPagamentoToken() == null
                    || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),
                            pedido.getPagamentoToken().getBytes(StandardCharsets.UTF_8))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso ao pagamento negado");
            }
            if (!"AGUARDANDO_PAGAMENTO".equals(pedido.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Este pedido não está aguardando pagamento");
            }
            if (pix && "PENDENTE_PIX".equals(pedido.getPagamentoStatus())
                    && pedido.getPixCopiaECola() != null) return pedido;
            if (!"PENDENTE".equals(pedido.getPagamentoStatus())
                    && !"RECUSADO".equals(pedido.getPagamentoStatus())) throw situacaoPagamento(pedido);
            pedido.setPagamentoReferencia(UUID.randomUUID().toString());
            pedido.setPagbankPedidoId(null);
            pedido.setPixCopiaECola(null);
            pedido.setPagamentoStatus("PROCESSANDO");
            return pedidos.save(pedido);
        });
    }

    private ResponseStatusException situacaoPagamento(Pedido pedido) {
        if ("RECUSADO".equals(pedido.getPagamentoStatus())) {
            return new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED,
                    "Pagamento recusado. Confira os dados antes de tentar novamente.");
        }
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Pagamento em processamento. Não faça outro pagamento; entre em contato com o restaurante.");
    }

    private void validarContato(String cpf, String email) {
        if (!cpfValido(apenasDigitos(cpf))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido");
        }
        if (email == null || !email.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail inválido");
        }
    }

    private static String apenasDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    static boolean cpfValido(String cpf) {
        if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) {
            return false;
        }
        for (int posicao = 9; posicao < 11; posicao++) {
            int soma = 0;
            for (int i = 0; i < posicao; i++) {
                soma += (cpf.charAt(i) - '0') * (posicao + 1 - i);
            }
            int digito = (soma * 10) % 11 % 10;
            if (digito != cpf.charAt(posicao) - '0') {
                return false;
            }
        }
        return true;
    }

    private static String qrCodeBase64(String texto) {
        try {
            BitMatrix matriz = new QRCodeWriter().encode(texto, BarcodeFormat.QR_CODE, 320, 320);
            BufferedImage imagem = new BufferedImage(matriz.getWidth(), matriz.getHeight(),
                    BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < matriz.getWidth(); x++) {
                for (int y = 0; y < matriz.getHeight(); y++) {
                    imagem.setRGB(x, y, matriz.get(x, y) ? 0x000000 : 0xFFFFFF);
                }
            }
            ByteArrayOutputStream saida = new ByteArrayOutputStream();
            ImageIO.write(imagem, "png", saida);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(saida.toByteArray());
        } catch (Exception erro) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao gerar o QR Code", erro);
        }
    }
}
