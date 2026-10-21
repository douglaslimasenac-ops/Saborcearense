package com.saborcearense.delivery.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.delivery.config.WebSocketConfig;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PedidoController {

    private static final Map<Long, PedidoSimulado> bancoPedidos = new ConcurrentHashMap<>();
    private static long idContador = 1;

    static {
        bancoPedidos.put(idContador, new PedidoSimulado(idContador++, "Maria da Silva", "Rua Floriano Peixoto, 123 - Centro", "Pix", "RECEBIDO"));
        bancoPedidos.put(idContador, new PedidoSimulado(idContador, "João Neto", "Av. Beira Mar, 450 - Ap 302", "Dinheiro", "RECEBIDO"));
    }

    @GetMapping("/ativos")
    public ResponseEntity<List<PedidoSimulado>> listarPedidosAtivos() {
        return ResponseEntity.ok(new ArrayList<>(bancoPedidos.values()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> atualizarStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String novoStatus = body.get("status");
        
        if (novoStatus == null || novoStatus.isEmpty()) {
            return ResponseEntity.badRequest().body("O campo 'status' é obrigatório.");
        }

        PedidoSimulado pedido = bancoPedidos.get(id);
        if (pedido == null) {
            return ResponseEntity.notFound().build();
        }

        pedido.setStatus(novoStatus.toUpperCase());
        WebSocketConfig.notificarTodos(pedido.getStatus());

        if ("ENTREGUE".equalsIgnoreCase(novoStatus)) {
            bancoPedidos.remove(id);
        }

        return ResponseEntity.ok(pedido);
    }

    public static class PedidoSimulado {
        private Long id;
        private String clienteNome;
        private String endereco;
        private String formaPagamento;
        private String status;

        public PedidoSimulado(Long id, String clienteNome, String endereco, String formaPagamento, String status) {
            this.id = id;
            this.clienteNome = clienteNome;
            this.endereco = endereco;
            this.formaPagamento = formaPagamento;
            this.status = status;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getClienteNome() { return clienteNome; }
        public void setClienteNome(String clienteNome) { this.clienteNome = clienteNome; }
        public String getEndereco() { return endereco; }
        public void setEndereco(String endereco) { this.endereco = endereco; }
        public String getFormaPagamento() { return formaPagamento; }
        public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
