package com.saborcearense.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import com.saborcearense.model.FuncionamentoRestaurante;
import com.saborcearense.repository.FuncionamentoRestauranteRepository;

class FuncionamentoRestauranteServiceTest {
    @Test
    void horarioAutomaticoRespeitaDiasELimites() {
        ZoneId zona = ZoneId.of("America/Sao_Paulo");
        assertFalse(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 7, 59, 59, 0, zona)));
        assertTrue(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 8, 0, 0, 0, zona)));
        assertTrue(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 14, 59, 59, 0, zona)));
        assertFalse(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 2, 15, 0, 0, 0, zona)));
        assertFalse(FuncionamentoRestauranteService.abertoNoHorario(ZonedDateTime.of(2026, 11, 1, 10, 0, 0, 0, zona)));
    }

    @Test
    void manualRetornaAoAutomaticoNaProximaTransicao() {
        var repository = mock(FuncionamentoRestauranteRepository.class);
        var salvo = new AtomicReference<FuncionamentoRestaurante>();
        when(repository.save(any(FuncionamentoRestaurante.class))).thenAnswer(invocacao -> {
            salvo.set(invocacao.getArgument(0));
            return salvo.get();
        });
        when(repository.findById(1L)).thenAnswer(invocacao -> Optional.ofNullable(salvo.get()));

        servico(repository, "2026-11-02T13:00:00Z").alterar(false);
        assertEquals(new FuncionamentoRestauranteService.Status(false, "MANUAL"),
                servico(repository, "2026-11-02T17:59:59Z").obterStatus());
        assertEquals(new FuncionamentoRestauranteService.Status(false, "AUTOMATICO"),
                servico(repository, "2026-11-02T18:00:00Z").obterStatus());

        servico(repository, "2026-11-02T20:00:00Z").alterar(true);
        assertEquals(new FuncionamentoRestauranteService.Status(true, "MANUAL"),
                servico(repository, "2026-11-03T10:59:59Z").obterStatus());
        assertEquals(new FuncionamentoRestauranteService.Status(true, "AUTOMATICO"),
                servico(repository, "2026-11-03T11:00:00Z").obterStatus());
    }

    @Test
    void proximaTransicaoPulaDomingoEConsideraHorarioExato() {
        ZoneId zona = ZoneId.of("America/Sao_Paulo");
        assertEquals(Instant.parse("2026-11-02T11:00:00Z"),
                FuncionamentoRestauranteService.proximaMudanca(ZonedDateTime.of(2026, 10, 31, 16, 0, 0, 0, zona)));
        assertEquals(Instant.parse("2026-11-02T11:00:00Z"),
                FuncionamentoRestauranteService.proximaMudanca(ZonedDateTime.of(2026, 11, 1, 10, 0, 0, 0, zona)));
        assertEquals(Instant.parse("2026-11-02T18:00:00Z"),
                FuncionamentoRestauranteService.proximaMudanca(ZonedDateTime.of(2026, 11, 2, 8, 0, 0, 0, zona)));
    }

    private FuncionamentoRestauranteService servico(FuncionamentoRestauranteRepository repository, String instante) {
        return new FuncionamentoRestauranteService(repository, Clock.fixed(Instant.parse(instante), ZoneId.of("UTC")));
    }
}
