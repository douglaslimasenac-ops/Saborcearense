package com.saborcearense.controller;

import java.util.List;
import java.io.IOException;
import java.util.Base64;
import java.util.concurrent.ThreadLocalRandom;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable; // Supondo o padrão do seu projeto
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import org.springframework.web.socket.TextMessage; // Adicione este import no topo da classe

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.repository.ChatMensagemRepository;
import com.saborcearense.service.FuncionamentoRestauranteService;
import com.saborcearense.service.NovoPedidoNotificador;
import com.saborcearense.service.PagBankService;
import com.saborcearense.service.ValidacaoItensSeparadosService;
import org.springframework.transaction.annotation.Transactional;


@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {
        // --- ADICIONE ESTE ENDPOINT EXATAMENTE ASSIM NO SEU PEDIDOCONTROLLER ---
    // Ele lista TODOS os pedidos do banco (ativos + entregues), permitindo alimentar o histórico
    @org.springframework.web.bind.annotation.GetMapping
    public java.util.List<com.saborcearense.model.Pedido> listarTodosOsPedidos() {
        // Altere 'pedidoRepository' para o nome exato do repositório injetado na sua classe
        return pedidoRepository.findByStatusNotIn(java.util.List.of("AGUARDANDO_PAGAMENTO"));
    }   

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private ChatMensagemRepository chatMensagemRepository;

    @Autowired
    private FuncionamentoRestauranteService funcionamentoRestauranteService;

    @Autowired
    private ValidacaoItensSeparadosService validacaoItensSeparadosService;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private PagBankService pagBankService;

    @Autowired
    private NovoPedidoNotificador notificadorNovoPedido;

    @Value("${app.impressao-automatica.enabled:false}")
    private boolean impressaoAutomaticaHabilitada;

    @PostConstruct
    void numerarPedidosLegados() {
        pedidoRepository.findAll().stream()
                .filter(pedido -> pedido.getNumeroPedido() == null)
                .forEach(pedido -> {
                    pedido.setNumeroPedido(gerarNumeroPedido());
                    pedidoRepository.save(pedido);
                });
    }

        // 📡 LISTAR PEDIDOS ATIVOS: Alimenta o painel administrativo em tempo real
    // Retorna todos os pedidos que NÃO foram finalizados (Status diferente de 'ENTREGUE')
    @GetMapping("/ativos")
    public List<Pedido> listarPedidosAtivos() {
        // Se o seu repositório não tiver essa query nativa, o Spring Boot aceita o método abaixo
        // ou você pode filtrar via stream na lista completa:
        return pedidoRepository.findByStatusNotIn(java.util.List.of("ENTREGUE", "CANCELADO", "AGUARDANDO_PAGAMENTO"));
    } // <-- ESSA CHAVE ESTAVA FALTANDO AQUI PARA FECHAR A FUNÇÃO DOS ATIVOS!

    @GetMapping("/pagamentos-pendentes")
    public List<com.fasterxml.jackson.databind.node.ObjectNode> listarPagamentosPendentes() {
        return pedidoRepository.findByStatusOrderByDataCriacaoDesc("AGUARDANDO_PAGAMENTO").stream().map(pedido -> {
            com.fasterxml.jackson.databind.node.ObjectNode resposta = mapper.valueToTree(pedido);
            if (pedido.getPagamentoReferencia() != null) {
                resposta.put("pagamentoReferencia", pedido.getPagamentoReferencia());
            }
            return resposta;
        }).toList();
    }

    // Consulta pública: nunca expõe nome, telefone, endereço ou dados de pagamento.
    private static java.util.Map<String, Object> visaoPublica(Pedido pedido) {
        boolean retirada = pedido.getEndereco() != null
                && pedido.getEndereco().trim().regionMatches(true, 0, "RETIRADA", 0, "RETIRADA".length());
        java.util.Map<String, Object> visao = new java.util.LinkedHashMap<>();
        visao.put("numeroPedido", pedido.getNumeroPedido());
        visao.put("status", pedido.getStatus());
        visao.put("pagamentoStatus", pedido.getPagamentoStatus());
        visao.put("formaPagamento", pedido.getFormaPagamento());
        visao.put("valorTotal", pedido.getValorTotal());
        visao.put("trocoPara", pedido.getTrocoPara());
        visao.put("itens", pedido.getItens());
        visao.put("endereco", retirada ? "RETIRADA NO ESTABELECIMENTO" : "ENTREGA");
        visao.put("dataCriacao", pedido.getDataCriacao());
        visao.put("previsaoEntregaInicio", pedido.getPrevisaoEntregaInicio());
        visao.put("previsaoEntregaFim", pedido.getPrevisaoEntregaFim());
        return visao;
    }

    // 🔍 BUSCAR STATUS POR ID: Chamado pelo site para rastrear o pedido
    @GetMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> buscarPedidoPorId(@PathVariable Long id) {
        return pedidoRepository.findById(id)
                .map(pedido -> ResponseEntity.ok(visaoPublica(pedido)))
                .orElse(ResponseEntity.notFound().build());
    }

   @GetMapping("/numero/{numeroPedido}")
   public ResponseEntity<java.util.Map<String, Object>> buscarPorNumeroPedido(@PathVariable Long numeroPedido) {
       return pedidoRepository.findByNumeroPedido(numeroPedido)
               .map(pedido -> ResponseEntity.ok(visaoPublica(pedido)))
               .orElse(ResponseEntity.notFound().build());
   }

   @org.springframework.web.bind.annotation.DeleteMapping("/historico-antigo")
   public ResponseEntity<java.util.Map<String, Object>> apagarHistoricoAntigo() {
       LocalDateTime limite = LocalDateTime.now().minusDays(2);
       int quantidade = pedidoRepository.deleteByStatusInAndDataCriacaoBefore(
               java.util.List.of("ENTREGUE", "CANCELADO"), limite);
       return ResponseEntity.ok(java.util.Map.of(
               "apagados", quantidade,
               "limite", limite));
   }

   @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
   public com.fasterxml.jackson.databind.node.ObjectNode receberNovoPedido(
           @Valid @org.springframework.web.bind.annotation.RequestPart("pedido") Pedido novoPedido,
           @org.springframework.web.bind.annotation.RequestPart(value = "comprovante", required = false) MultipartFile comprovante) {
       verificarFuncionamento();
       anexarComprovante(novoPedido, comprovante);
       return respostaNovoPedido(salvarNovoPedido(novoPedido));
   }

   @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
   public com.fasterxml.jackson.databind.node.ObjectNode receberNovoPedidoJson(@Valid @org.springframework.web.bind.annotation.RequestBody Pedido novoPedido) {
       verificarFuncionamento();
       return respostaNovoPedido(salvarNovoPedido(novoPedido));
   }

   private com.fasterxml.jackson.databind.node.ObjectNode respostaNovoPedido(Pedido pedido) {
       com.fasterxml.jackson.databind.node.ObjectNode resposta = mapper.valueToTree(pedido);
       if (pedido.getPagamentoToken() != null) {
           resposta.put("pagamentoToken", pedido.getPagamentoToken());
       }
       return resposta;
   }

   private void verificarFuncionamento() {
       var status = funcionamentoRestauranteService.obterStatus();
       if (!status.aberto()) {
           throw new ResponseStatusException(HttpStatus.CONFLICT, "Restaurante fechado no momento");
       }
   }

   private Pedido salvarNovoPedido(Pedido novoPedido) {
      validacaoItensSeparadosService.validar(novoPedido);
      // Campos de controle pertencem ao servidor, não ao navegador do cliente.
      novoPedido.setId(null);
      novoPedido.setNumeroPedido(gerarNumeroPedido());
       novoPedido.setDataCriacao(java.time.LocalDateTime.now());
       novoPedido.setStatus("RECEBIDO");
       novoPedido.setPagamentoStatus(null);
       novoPedido.setPagbankPedidoId(null);
       novoPedido.setPixCopiaECola(null);
       novoPedido.setPagamentoReferencia(null);
       novoPedido.setPagamentoToken(null);
       boolean pagamentoOnline = "Online".equalsIgnoreCase(novoPedido.getFormaPagamento());
       if (pagamentoOnline) {
           if (!pagBankService.habilitado()) {
               throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Pagamento online indisponível");
           }
           novoPedido.setFormaPagamento("Online");
           novoPedido.setStatus("AGUARDANDO_PAGAMENTO");
           novoPedido.setPagamentoStatus("PENDENTE");
           novoPedido.setPagamentoToken(java.util.UUID.randomUUID().toString());
       }
       novoPedido.setImpressaoPendente(impressaoAutomaticaHabilitada && !pagamentoOnline);
       if (novoPedido.getEndereco().trim().regionMatches(true, 0, "RETIRADA", 0, "RETIRADA".length())) {
           novoPedido.setPrevisaoEntregaInicio(null);
           novoPedido.setPrevisaoEntregaFim(null);
       } else {
           LocalDateTime inicio = calcularInicioPrevisao(LocalDateTime.now(ZoneId.of("America/Sao_Paulo")));
           novoPedido.setPrevisaoEntregaInicio(inicio);
           novoPedido.setPrevisaoEntregaFim(inicio.plusMinutes(10));
       }
        
        System.out.println("Sabor Cearense: Novo pedido recebido #" + novoPedido.getNumeroPedido());
        
        // Salva no banco de dados primeiro
        Pedido pedidoSalvo = pedidoRepository.save(novoPedido);

        if (!pagamentoOnline) {
            notificadorNovoPedido.notificar(pedidoSalvo);
        }
        return pedidoSalvo;
    }

    static LocalDateTime calcularInicioPrevisao(LocalDateTime recebido) {
        LocalDateTime inicioEntregas = recebido.toLocalDate().atTime(LocalTime.of(11, 30));
        LocalDateTime inicio = recebido.isBefore(inicioEntregas) ? inicioEntregas : recebido;
        if (inicio.getSecond() != 0 || inicio.getNano() != 0) {
            inicio = inicio.plusMinutes(1).withSecond(0).withNano(0);
        }
        return inicio.plusMinutes(40);
    }

    @GetMapping("/{id}/comprovante")
    public ResponseEntity<Resource> baixarComprovante(@PathVariable Long id) {
        return pedidoRepository.findById(id)
                .filter(pedido -> pedido.getComprovantePix() != null && !pedido.getComprovantePix().isBlank())
                .map(pedido -> {
                    MediaType tipo = MediaType.APPLICATION_OCTET_STREAM;
                    try {
                        tipo = MediaType.parseMediaType(pedido.getComprovantePixTipo());
                    } catch (IllegalArgumentException ignored) {
                        // Usa o tipo genérico para arquivos antigos ou metadados inválidos.
                    }
                    Resource recurso = new ByteArrayResource(Base64.getDecoder().decode(pedido.getComprovantePix()));
                    return ResponseEntity.ok()
                            .contentType(tipo)
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "inline; filename=\"" + nomeSeguro(pedido.getComprovantePixNome()) + "\"")
                            .body(recurso);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private void anexarComprovante(Pedido pedido, MultipartFile comprovante) {
        if (comprovante == null || comprovante.isEmpty()) {
            return;
        }
        if (comprovante.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "O comprovante deve ter no máximo 5 MB");
        }
        String tipo = comprovante.getContentType();
        if (!java.util.Set.of("image/jpeg", "image/png", "image/webp", "application/pdf").contains(tipo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Envie o comprovante em JPG, PNG, WEBP ou PDF");
        }
        try {
            pedido.setComprovantePix(Base64.getEncoder().encodeToString(comprovante.getBytes()));
        } catch (IOException erro) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Não foi possível ler o comprovante enviado", erro);
        }
        pedido.setComprovantePixTipo(tipo);
        pedido.setComprovantePixNome(nomeSeguro(comprovante.getOriginalFilename()));
    }

    private String nomeSeguro(String nome) {
        if (nome == null || nome.isBlank()) {
            return "comprovante-pix";
        }
        return nome.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private Long gerarNumeroPedido() {
        Long numero;
        do {
            numero = ThreadLocalRandom.current().nextLong(1000, 10000);
        } while (pedidoRepository.existsByNumeroPedido(numero));
        return numero;
    }

    // 🔄 ATUALIZAR STATUS DO PEDIDO: Gerencia o fluxo de entrega (Preparo, Despacho, Finalização)
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<Pedido> mudarStatusPedido(
            @PathVariable Long id, 
            @RequestParam String status) {
        String statusNormalizado = status == null ? "" : status.trim().toUpperCase();
        if (!java.util.Set.of("RECEBIDO", "PREPARO", "ENTREGA", "ENTREGUE", "CANCELADO").contains(statusNormalizado)) {
            return ResponseEntity.badRequest().build();
        }
        
        return pedidoRepository.findByIdForUpdate(id).map(pedido -> {
            if ("Online".equalsIgnoreCase(pedido.getFormaPagamento())
                    && !"PAGO".equals(pedido.getPagamentoStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Pagamento ainda não confirmado");
            }
            pedido.setStatus(statusNormalizado);
            if (java.util.Set.of("ENTREGUE", "CANCELADO").contains(statusNormalizado)
                    && pedido.getNumeroPedido() != null) {
                chatMensagemRepository.deleteByNumeroPedido(pedido.getNumeroPedido());
            }
            Pedido pedidoAtualizado = pedidoRepository.save(pedido);
            System.out.println("Sabor Cearense: Pedido #" + id + " alterado para o status: " + status);
            return ResponseEntity.ok(pedidoAtualizado);
        }).orElse(ResponseEntity.notFound().build());
    }
}
