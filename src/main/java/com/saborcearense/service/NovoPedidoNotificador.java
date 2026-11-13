package com.saborcearense.service;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.config.WebSocketConfig;
import com.saborcearense.model.Pedido;

/** Avisa as telas do admin conectadas sobre um pedido pronto para ser produzido. */
@Component
public class NovoPedidoNotificador {
    private final ObjectMapper mapper;

    public NovoPedidoNotificador(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public void notificar(Pedido pedido) {
        try {
            TextMessage mensagem = new TextMessage(mapper.writeValueAsString(pedido));
            for (WebSocketSession sessao : WebSocketConfig.getSessoes()) {
                if (sessao.isOpen()) {
                    sessao.sendMessage(mensagem);
                }
            }
        } catch (IOException e) {
            System.err.println("Erro ao enviar pedido via WebSocket: " + e.getMessage());
        }
    }
}
