package com.saborcearense.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.HandlerInterceptor;

public class AdminAuthInterceptor implements HandlerInterceptor {
    private final AdminTokenService tokenService;

    public AdminAuthInterceptor(AdminTokenService tokenService) {
        this.tokenService = tokenService;
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
        if (header != null && header.startsWith("Bearer ")
                && tokenService.isValid(header.substring("Bearer ".length()).trim())) {
            return true;
        }

        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Autenticacao administrativa necessaria");
        return false;
    }
}
