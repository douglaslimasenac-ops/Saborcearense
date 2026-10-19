package com.saborcearense.controller;

import com.saborcearense.model.Pedido;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*") // Permite que seu Front HTML acesse o Back no Render
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
        Pedido novoPedido = new Pedido(idUnico);
        pedidosTemporarios.put(idUnico, novoPedido);
        return novoPedido;
    }

    // O link que o restaurante vai clicar no WhatsApp para mudar o status
    @GetMapping("/{id}/confirmar")
    @ResponseBody
    public String confirmarPedido(@PathVariable String id) {
        Pedido pedido = pedidosTemporarios.get(id);
        if (pedido != null) {
            pedido.setStatus("CONFIRMADO");
            
            // Dispara a mensagem via WebSocket para o canal específico deste pedido
            messagingTemplate.convertAndSend("/topic/pedido/" + id, "CONFIRMADO");
            
            return "<html><body style='text-align:center;font-family:sans-serif;margin-top:50px;'>"
                 + "<h2>✅ Pedido #" + id + " confirmado com sucesso!</h2>"
                 + "<p>O cliente já foi notificado na tela dele em tempo real.</p>"
                 + "</body></html>";
        }
        return "<html><body><h2>❌ Erro: Pedido não encontrado ou já expirou.</h2></body></html>";
    }
}
