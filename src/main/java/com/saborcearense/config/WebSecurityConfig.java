package com.saborcearense.config;

import com.saborcearense.security.AdminAuthInterceptor;
import com.saborcearense.security.AdminTokenService;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;

@Configuration
public class WebSecurityConfig implements WebMvcConfigurer {
    private final AdminTokenService tokenService;
    private final String[] allowedOrigins;

    public WebSecurityConfig(AdminTokenService tokenService,
            @Value("${app.allowed-origins:http://localhost:8080}") String allowedOrigins) {
        this.tokenService = tokenService;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).toArray(String[]::new);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AdminAuthInterceptor(tokenService))
                .addPathPatterns("/api/admin/**", "/api/pedidos", "/api/pedidos/ativos",
                        "/api/pedidos/*/status", "/api/pedidos/*/comprovante",
                        "/api/pedidos/historico-antigo", "/api/chat/admin", "/api/chat/admin/**");
    }

    @Override
    public void addCorsMappings(org.springframework.web.servlet.config.annotation.CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "Accept")
                .allowCredentials(false);
    }
}
