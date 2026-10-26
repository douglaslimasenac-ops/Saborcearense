package com.saborcearense.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable; // Supondo o padrão do seu projeto
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.socket.TextMessage; // Adicione este import no topo da classe

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;


@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {
        // --- ADICIONE ESTE ENDPOINT EXATAMENTE ASSIM NO SEU PEDIDOCONTROLLER ---
    // Ele lista TODOS os pedidos do banco (ativos + entregues), permitindo alimentar o histórico
    @org.springframework.web.bind.annotation.GetMapping
    public java.util.List<com.saborcearense.model.Pedido> listarTodosOsPedidos() {
        // Altere 'pedidoRepository' para o nome exato do repositório injetado na sua classe
        return pedidoRepository.findAll(); 
    }   

    @Autowired
    private PedidoRepository pedidoRepository;

        // 📡 LISTAR PEDIDOS ATIVOS: Alimenta o painel administrativo em tempo real
    // Retorna todos os pedidos que NÃO foram finalizados (Status diferente de 'ENTREGUE')
    @GetMapping("/ativos")
    public List<Pedido> listarPedidosAtivos() {
        // Se o seu repositório não tiver essa query nativa, o Spring Boot aceita o método abaixo
        // ou você pode filtrar via stream na lista completa:
        return pedidoRepository.findAll().stream()
                .filter(pedido -> ! "ENTREGUE".equalsIgnoreCase(pedido.getStatus()))
                .toList();
    } // <-- ESSA CHAVE ESTAVA FALTANDO AQUI PARA FECHAR A FUNÇÃO DOS ATIVOS!

    // 🔍 BUSCAR STATUS POR ID: Chamado pelo site para rastrear o pedido
    @GetMapping("/{id}")
    public ResponseEntity<Pedido> buscarPedidoPorId(@PathVariable Long id) {
        return pedidoRepository.findById(id)
                .map(pedido -> ResponseEntity.ok(pedido))
                .orElse(ResponseEntity.notFound().build());
    }

   @PostMapping
    public Pedido receberNovoPedido(@RequestBody Pedido novoPedido) {
        // Define o status inicial padrão exigido pela linha do tempo
        if (novoPedido.getStatus() == null || novoPedido.getStatus().isEmpty()) {
            novoPedido.setStatus("RECEBIDO");
        }
        
        System.out.println("Sabor Cearense: Novo pedido recebido do cliente " + novoPedido.getClienteNome());
        
        // Salva no banco de dados primeiro
        Pedido pedidoSalvo = pedidoRepository.save(novoPedido);

        // 👇 TRANSMITE O PEDIDO SALVO VIA WEBSOCKET EM TEMPO REAL
        try {
            ObjectMapper mapper = new ObjectMapper();
            // Converte o objeto Pedido completo para uma String JSON
            String pedidoJson = mapper.writeValueAsString(pedidoSalvo); 
            TextMessage message = new TextMessage(pedidoJson);

            // Percorre todas as telas do admin conectadas e envia o novo pedido
            for (org.springframework.web.socket.WebSocketSession sessao : com.saborcearense.config.WebSocketConfig.getSessoes()) {
                if (sessao.isOpen()) {
                    sessao.sendMessage(message);
                }
            }
            System.out.println("🌵 Sabor Cearense: Alerta de novo pedido enviado via WebSocket!");
        } catch (Exception e) {
            System.err.println("Erro ao enviar pedido via WebSocket: " + e.getMessage());
        }

        return pedidoSalvo;
    }

    // 🔄 ATUALIZAR STATUS DO PEDIDO: Gerencia o fluxo de entrega (Preparo, Despacho, Finalização)
    @PutMapping("/{id}/status")
    public ResponseEntity<Pedido> mudarStatusPedido(
            @PathVariable Long id, 
            @RequestParam String status) {
        
        return pedidoRepository.findById(id).map(pedido -> {
            pedido.setStatus(status.toUpperCase().trim());
            Pedido pedidoAtualizado = pedidoRepository.save(pedido);
            System.out.println("Sabor Cearense: Pedido #" + id + " alterado para o status: " + status);
            return ResponseEntity.ok(pedidoAtualizado);
        }).orElse(ResponseEntity.notFound().build());
    }
}


