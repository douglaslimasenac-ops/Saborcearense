package com.saborcearense.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.HandlerInterceptor;

public class AdminAuthInterceptor implements HandlerInterceptor {
    private final AdminTokenService tokenService;
    private final DispositivoImpressaoService dispositivos;

    public AdminAuthInterceptor(AdminTokenService tokenService, DispositivoImpressaoService dispositivos) {
        this.tokenService = tokenService;
        this.dispositivos = dispositivos;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        if (request.getRequestURI().equals("/api/admin/auth/login")) {
            return true;
        }
        if ("POST".equalsIgnoreCase(request.getMethod())
                && request.getRequestURI().equals("/api/pedidos")) {
            return true;
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();
            if (tokenService.isValid(token)) return true;
            String uri = request.getRequestURI();
            boolean acessoImpressao = ("GET".equalsIgnoreCase(request.getMethod())
                    && (uri.equals("/api/admin/impressao/configuracao") || uri.equals("/api/admin/impressao/pendentes")))
                    || ("POST".equalsIgnoreCase(request.getMethod())
                    && uri.matches("/api/admin/impressao/[0-9]+/confirmar"));
            if (acessoImpressao && dispositivos.credencialValida(token)) return true;
        }

        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Autenticacao administrativa necessaria");
        return false;
    }
}
