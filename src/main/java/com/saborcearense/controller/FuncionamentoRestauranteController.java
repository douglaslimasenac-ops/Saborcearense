package com.saborcearense.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.saborcearense.service.FuncionamentoRestauranteService;
import com.saborcearense.service.FuncionamentoRestauranteService.Status;

@RestController
public class FuncionamentoRestauranteController {
    private final FuncionamentoRestauranteService service;

    public FuncionamentoRestauranteController(FuncionamentoRestauranteService service) {
        this.service = service;
    }

    @GetMapping("/api/funcionamento")
    public Status consultar() {
        return service.obterStatus();
    }

    @PutMapping("/api/admin/funcionamento")
    public Status alterar(@Valid @RequestBody Alteracao alteracao) {
        return service.alterar(alteracao.aberto());
    }

    public record Alteracao(@NotNull Boolean aberto) {
    }
}
