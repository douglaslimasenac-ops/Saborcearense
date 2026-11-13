package com.saborcearense.controller;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PagamentoControllerTest {
    @Test
    void validaCpf() {
        assertTrue(PagamentoController.cpfValido("12345678909"));
        assertFalse(PagamentoController.cpfValido("12345678900"));
        assertFalse(PagamentoController.cpfValido("11111111111"));
        assertFalse(PagamentoController.cpfValido("123"));
    }
}
