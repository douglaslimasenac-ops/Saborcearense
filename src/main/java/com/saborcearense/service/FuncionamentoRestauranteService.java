package com.saborcearense.service;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.springframework.stereotype.Service;
import com.saborcearense.model.FuncionamentoRestaurante;
import com.saborcearense.repository.FuncionamentoRestauranteRepository;

@Service
public class FuncionamentoRestauranteService {
    private final FuncionamentoRestauranteRepository repository;

    public FuncionamentoRestauranteService(FuncionamentoRestauranteRepository repository) {
        this.repository = repository;
    }

    public Status obterStatus() {
        return repository.findById(1L)
                .map(configuracao -> new Status(configuracao.isAberto(), "MANUAL"))
                .orElseGet(() -> new Status(abertoNoHorario(ZonedDateTime.now(ZoneId.of("America/Sao_Paulo"))), "AUTOMATICO"));
    }

    public Status alterar(boolean aberto) {
        repository.save(new FuncionamentoRestaurante(aberto));
        return new Status(aberto, "MANUAL");
    }

    static boolean abertoNoHorario(ZonedDateTime agora) {
        LocalTime hora = agora.toLocalTime();
        return agora.getDayOfWeek() != DayOfWeek.SUNDAY
                && !hora.isBefore(LocalTime.of(8, 0))
                && hora.isBefore(LocalTime.of(15, 1));
    }

    public record Status(boolean aberto, String modo) {
    }
}
