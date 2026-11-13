package com.saborcearense.config;

import com.saborcearense.security.AdminAuthInterceptor;
import com.saborcearense.security.AdminTokenService;
import com.saborcearense.security.DispositivoImpressaoService;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;

@Configuration
public class WebSecurityConfig implements WebMvcConfigurer {
    private final AdminTokenService tokenService;
    private final DispositivoImpressaoService dispositivos;
    private final String[] allowedOrigins;

    public WebSecurityConfig(AdminTokenService tokenService, DispositivoImpressaoService dispositivos,
            @Value("${app.allowed-origins:http://localhost:8080}") String allowedOrigins) {
        this.tokenService = tokenService;
        this.dispositivos = dispositivos;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).toArray(String[]::new);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AdminAuthInterceptor(tokenService, dispositivos))
                .addPathPatterns("/api/admin/**", "/api/pedidos", "/api/pedidos/ativos", "/api/pedidos/pagamentos-pendentes",
                        "/api/pedidos/*/status", "/api/pedidos/*/comprovante",
                        "/api/pedidos/historico-antigo", "/api/chat/admin", "/api/chat/admin/**",
                        "/api/clientes/**");
    }

    @Override
    public void addCorsMappings(org.springframework.web.servlet.config.annotation.CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "Accept", "X-Pagamento-Token")
                .allowCredentials(false);
    }
}
