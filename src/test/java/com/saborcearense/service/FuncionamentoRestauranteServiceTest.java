package com.saborcearense.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;

class FuncionamentoRestauranteServiceTest {
    @Test
    void horarioAutomaticoRespeitaDiasELimites() {
        ZoneId zona = ZoneId.of("America/Sao_Paulo");
        assertFalse(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 7, 59, 59, 0, zona)));
        assertTrue(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 8, 0, 0, 0, zona)));
        assertTrue(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 15, 0, 59, 0, zona)));
        assertFalse(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 15, 1, 0, 0, zona)));
        assertFalse(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 1, 10, 0, 0, 0, zona)));
    }
}
