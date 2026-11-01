package com.saborcearense.service;

import java.time.DayOfWeek;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.saborcearense.model.FuncionamentoRestaurante;
import com.saborcearense.repository.FuncionamentoRestauranteRepository;

@Service
public class FuncionamentoRestauranteService {
    private final FuncionamentoRestauranteRepository repository;
    private final Clock clock;
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final LocalTime ABERTURA = LocalTime.of(8, 0);
    private static final LocalTime FECHAMENTO = LocalTime.of(15, 0);

    @Autowired
    public FuncionamentoRestauranteService(FuncionamentoRestauranteRepository repository) {
        this(repository, Clock.systemUTC());
    }

    FuncionamentoRestauranteService(FuncionamentoRestauranteRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public Status obterStatus() {
        ZonedDateTime agora = ZonedDateTime.now(clock).withZoneSameInstant(ZONA);
        var configuracao = repository.findById(1L);
        if (configuracao.isPresent() && configuracao.get().getManualAte() == null) {
            repository.definirPrazoLegado(proximaMudanca(agora));
            configuracao = repository.findById(1L);
        }
        return configuracao
                .filter(valor -> agora.toInstant().isBefore(valor.getManualAte()))
                .map(valor -> new Status(valor.isAberto(), "MANUAL"))
                .orElseGet(() -> new Status(abertoNoHorario(agora), "AUTOMATICO"));
    }

    public Status alterar(boolean aberto) {
        ZonedDateTime agora = ZonedDateTime.now(clock).withZoneSameInstant(ZONA);
        repository.save(new FuncionamentoRestaurante(aberto, proximaMudanca(agora)));
        return new Status(aberto, "MANUAL");
    }

    static boolean abertoNoHorario(ZonedDateTime agora) {
        LocalTime hora = agora.toLocalTime();
        return agora.getDayOfWeek() != DayOfWeek.SUNDAY
                && !hora.isBefore(ABERTURA)
                && hora.isBefore(FECHAMENTO);
    }

    static Instant proximaMudanca(ZonedDateTime agora) {
        LocalDate dia = agora.toLocalDate();
        while (true) {
            if (dia.getDayOfWeek() != DayOfWeek.SUNDAY) {
                for (LocalTime horario : new LocalTime[] { ABERTURA, FECHAMENTO }) {
                    ZonedDateTime mudanca = dia.atTime(horario).atZone(ZONA);
                    if (mudanca.isAfter(agora)) return mudanca.toInstant();
                }
            }
            dia = dia.plusDays(1);
        }
    }

    public record Status(boolean aberto, String modo) {
    }
}
