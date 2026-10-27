package com.saborcearense.security;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class AdminTokenServiceTest {
    private final AdminTokenService service = new AdminTokenService("admin", "senha-segura");

    @Test
    void createsTokenForValidCredentials() {
        String token = service.authenticate("admin", "senha-segura");

        assertNotNull(token);
        assertTrue(service.isValid(token));
    }

    @Test
    void rejectsInvalidCredentials() {
        assertNull(service.authenticate("admin", "errada"));
    }

    @Test
    void rejectsBlankConfiguredPassword() {
        AdminTokenService serviceWithoutPassword = new AdminTokenService("admin", "");

        assertNull(serviceWithoutPassword.authenticate("admin", ""));
    }
}
