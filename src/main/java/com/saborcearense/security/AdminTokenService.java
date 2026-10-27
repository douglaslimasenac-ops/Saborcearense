package com.saborcearense.security;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdminTokenService {
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();
    private final String username;
    private final String password;

    public AdminTokenService(
            @Value("${app.admin.username:admin}") String username,
            @Value("${app.admin.password:change-me}") String password) {
        this.username = username;
        this.password = password;
    }

    public String authenticate(String providedUsername, String providedPassword) {
        if (password.isBlank() || !username.equals(providedUsername) || !password.equals(providedPassword)) {
            return null;
        }

        String token = UUID.randomUUID().toString();
        tokens.put(token, System.currentTimeMillis());
        return token;
    }

    public boolean isValid(String token) {
        return token != null && tokens.containsKey(token);
    }
}
