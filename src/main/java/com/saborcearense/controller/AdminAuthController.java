package com.saborcearense.controller;

import java.util.Map;

import com.saborcearense.security.AdminTokenService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {
    private final AdminTokenService tokenService;

    public AdminAuthController(AdminTokenService tokenService) {
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequest request) {
        String token = tokenService.authenticate(request.username(), request.password());
        if (token == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(Map.of("token", token));
    }

    public record LoginRequest(String username, String password) {
    }
}
