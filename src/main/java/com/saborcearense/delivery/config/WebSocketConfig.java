package com.saborcearense.delivery.config;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler; // <--- Importação correta adicionada aqui!

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private static final List<WebSocketSession> sessoesAtivas = new CopyOnWriteArrayList<>();

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new StatusHandler(), "/ws-status").setAllowedOrigins("*");
    }

    private static class StatusHandler extends TextWebSocketHandler {
        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            sessoesAtivas.add(session);
        }

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
            notificarTodos(message.getPayload());
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
            sessoesAtivas.remove(session);
        }
    }

    public static void notificarTodos(String mensagemStatus) {
        for (WebSocketSession sessao : sessoesAtivas) {
            if (sessao.isOpen()) {
                try {
                    sessao.sendMessage(new TextMessage(mensagemStatus));
                } catch (IOException e) {
                    System.err.println("Erro ao transmitir via WebSocket: " + e.getMessage());
                }
            }
        }
    }
}
