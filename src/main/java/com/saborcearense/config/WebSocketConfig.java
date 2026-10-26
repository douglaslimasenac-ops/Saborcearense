package com.saborcearense.config;

import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry; // Import explícito para o compilador Linux
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final static CopyOnWriteArrayList<WebSocketSession> sessoes = new CopyOnWriteArrayList<>();

    // 👇 MÉTODO ADICIONADO: Permite que o PedidoController acesse as sessões ativas do painel admin
    public static CopyOnWriteArrayList<WebSocketSession> getSessoes() {
        return sessoes;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new TextWebSocketHandler() {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                sessoes.add(session);
            }

            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
                // Transmite a atualização de status para todas as telas conectadas
                for (WebSocketSession s : sessoes) {
                    if (s.isOpen()) {
                        s.sendMessage(message);
                    }
                }
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                sessoes.remove(session);
            }
        }, "/ws-status").setAllowedOrigins("*");
    }
}

