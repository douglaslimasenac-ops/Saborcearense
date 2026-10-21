package com.saborcearense.delivery.controller;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.delivery.model.Pedido;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PedidoController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Repositório em memória para guardar temporariamente os estados dos pedidos ativos
    private final ConcurrentHashMap<String, Pedido> pedidosTemporarios = new ConcurrentHashMap<>();

    // Endpoint chamado pelo Front para gerar o ID do pedido antes de abrir o WhatsApp
    @PostMapping("/criar")
    public Pedido criarPedido() {
        // Gera um código alfanumérico único de 6 caracteres (Ex: D83F1A)
        String idUnico = UUID.randomUUID().toString().substring(0, 6).toUpperCase(); 
        
        Pedido novoPedido = new Pedido();
        novoPedido.setId(idUnico);
        novoPedido.setStatus("PENDENTE");
        
        pedidosTemporarios.put(idUnico, novoPedido);
        return novoPedido;
    }

    // O link que o restaurante vai clicar no WhatsApp para mudar o status para confirmado
    @GetMapping("/{id}/confirmar")
    @ResponseBody
    public String confirmarPedido(@PathVariable String id) {
        Pedido pedido = pedidosTemporarios.get(id);
        if (pedido != null) {
            pedido.setStatus("CONFIRMADO");
            
            // Notifica o frontend (acompanhar.html) via WebSocket em tempo real
            messagingTemplate.convertAndSend("/topic/pedido/" + id, "CONFIRMADO");
            
            return "<html><body style='text-align:center;font-family:sans-serif;margin-top:50px;color:#2c3e50;'>"
                 + "<h2>✅ Pedido #" + id + " confirmado com sucesso!</h2>"
                 + "<p style='font-size:1.1rem;color:#7f8c8d;'>O cliente já foi notificado na tela dele em tempo real.</p>"
                 + "</body></html>";
        }
        return "<html><body style='text-align:center;font-family:sans-serif;margin-top:50px;color:#c0392b;'>"
             + "<h2>❌ Erro: Pedido não encontrado ou código expirado.</h2>"
             + "</body></html>";
    }
}
