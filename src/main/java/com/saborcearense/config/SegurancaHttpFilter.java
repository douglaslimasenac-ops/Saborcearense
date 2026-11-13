package com.saborcearense.config;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Cabeçalhos de segurança e limite de tentativas por IP nas rotas sensíveis. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SegurancaHttpFilter extends OncePerRequestFilter {
    private static final long JANELA_MS = 60_000;
    private static final int LIMITE_LOGIN = 10;
    private static final int LIMITE_PAGAMENTO = 20;
    private static final int LIMITE_PEDIDO = 60;

    private final ConcurrentHashMap<String, Deque<Long>> tentativas = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        aplicarCabecalhos(request, response);

        String caminho = request.getRequestURI();
        boolean post = "POST".equalsIgnoreCase(request.getMethod());
        boolean login = post && caminho.equals("/api/admin/auth/login");
        boolean pagamento = post && caminho.startsWith("/api/pagamentos/") && !caminho.equals("/api/pagamentos/webhook");
        boolean pedido = post && caminho.equals("/api/pedidos");

        if (!login && !pagamento && !pedido) {
            chain.doFilter(request, response);
            return;
        }

        String chave = (login ? "login:" : pagamento ? "pagamento:" : "pedido:") + ipDoCliente(request);
        int limite = login ? LIMITE_LOGIN : pagamento ? LIMITE_PAGAMENTO : LIMITE_PEDIDO;
        if (!registrar(chave, limite)) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            return;
        }
        chain.doFilter(request, response);
    }

    private void aplicarCabecalhos(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        response.setHeader("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
        if ("https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto")) || request.isSecure()) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        String caminho = request.getRequestURI();
        if (caminho.startsWith("/api/pagamentos") || caminho.startsWith("/api/clientes")
                || caminho.startsWith("/api/pedidos") || caminho.startsWith("/api/admin")) {
            response.setHeader("Cache-Control", "no-store");
        }
    }

    private static String ipDoCliente(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private synchronized boolean registrar(String chave, int limite) {
        if (!tentativas.containsKey(chave) && tentativas.size() >= 10_000) {
            tentativas.values().forEach(SegurancaHttpFilter::limpar);
            tentativas.entrySet().removeIf(entrada -> entrada.getValue().isEmpty());
            if (tentativas.size() >= 10_000) return false;
        }
        Deque<Long> fila = tentativas.computeIfAbsent(chave, k -> new ArrayDeque<>());
        limpar(fila);
        if (fila.size() >= limite) {
            return false;
        } else {
            fila.addLast(System.currentTimeMillis());
            return true;
        }
    }

    private static void limpar(Deque<Long> fila) {
        long corte = System.currentTimeMillis() - JANELA_MS;
        while (!fila.isEmpty() && fila.peekFirst() < corte) {
            fila.removeFirst();
        }
    }
}
