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
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import com.saborcearense.security.AdminTokenService;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final static CopyOnWriteArrayList<WebSocketSession> sessoes = new CopyOnWriteArrayList<>();
    private final String[] allowedOrigins;
    private final AdminTokenService tokenService;

    public WebSocketConfig(@Value("${app.allowed-origins:http://localhost:8080}") String allowedOrigins,
            AdminTokenService tokenService) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).toArray(String[]::new);
        this.tokenService = tokenService;
    }

    // 👇 MÉTODO ADICIONADO: Permite que o PedidoController acesse as sessões ativas do painel admin
    public static CopyOnWriteArrayList<WebSocketSession> getSessoes() {
        return sessoes;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new TextWebSocketHandler() {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                String query = session.getUri() == null ? null : session.getUri().getQuery();
                String token = null;
                if (query != null) {
                    for (String parameter : query.split("&")) {
                        if (parameter.startsWith("token=")) {
                            token = URLDecoder.decode(parameter.substring("token=".length()), StandardCharsets.UTF_8);
                            break;
                        }
                    }
                }
                if (!tokenService.isValid(token)) {
                    session.close(CloseStatus.POLICY_VIOLATION);
                    return;
                }
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
        }, "/ws-status").setAllowedOrigins(allowedOrigins);
    }
}
