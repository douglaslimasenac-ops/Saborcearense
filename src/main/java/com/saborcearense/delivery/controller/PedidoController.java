package com.saborcearense.delivery.controller;

import com.saborcearense.delivery.model.Pedido;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PedidoController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Guarda temporariamente os pedidos na memória do servidor
    private final ConcurrentHashMap<String, Pedido> pedidosTemporarios = new ConcurrentHashMap<>();

    // Endpoint chamado pelo Front para gerar o ID do pedido antes do WhatsApp
    @PostMapping("/criar")
    public Pedido criarPedido() {
        // Gera um código único de 6 caracteres (Ex: X7R9B2)
        String idUnico = UUID.randomUUID().toString().substring(0, 6).toUpperCase(); 
        
        // CORREÇÃO 1: Usa o construtor padrão e injeta o ID via Setter (ou adiciona no mapa)
        Pedido novoPedido = new Pedido();
        novoPedido.setId(idUnico); // Certifique-se de que a sua classe Pedido possui setId()
        novoPedido.setStatus("PENDENTE"); // Certifique-se de que possui setStatus()
        
        pedidosTemporarios.put(idUnico, novoPedido);
        return novoPedido;
    }

    // O link que o restaurante vai clicar no WhatsApp para mudar o status
    @GetMapping("/{id}/confirmar")
    @ResponseBody
    public String confirmarPedido(@PathVariable String id) {
        Pedido pedido = pedidosTemporarios.get(id);
        if (pedido != null) {
            // CORREÇÃO 2: Atualiza o status do objeto
            pedido.setStatus("CONFIRMADO");
            
            // Dispara a mensagem via WebSocket para o canal específico deste pedido
            messagingTemplate.convertAndSend("/topic/pedido/" + id, "CONFIRMADO");
            
            return "<html><body style='text-align:center;font-family:sans-serif;margin-top:50px;'>"
                 + "<h2>✅ Pedido #" + id + " confirmado com sucesso!</h2>"
                 + "<p>O cliente já foi notificado na tela dele em tempo real.</p>"
                 + "</body></html>";
        }
        return "<html><body style='text-align:center;font-family:sans-serif;margin-top:50px;color:#c0392b;'>"
             + "<h2>❌ Erro: Pedido não encontrado ou já expirou.</h2>"
             + "</body></html>";
    }
}
