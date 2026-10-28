package com.saborcearense.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.model.Acompanhamento;
import com.saborcearense.repository.AcompanhamentoRepository;

import jakarta.annotation.PostConstruct;

@RestController
public class AcompanhamentoController {

    private final AcompanhamentoRepository repository;

    public AcompanhamentoController(AcompanhamentoRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    void inicializarAcompanhamentos() {
        adicionarSeNaoExistir("Maionese", "🥗");
        adicionarSeNaoExistir("Macarronese", "🍝");
        adicionarSeNaoExistir("Salada de Legumes", "🥕");
        adicionarSeNaoExistir("Salada Verde", "🥬");
        adicionarSeNaoExistir("Legumes", "🥦");
        adicionarSeNaoExistir("Purê", "🥔");
        adicionarSeNaoExistir("Espaguete", "🍝");
        adicionarSeNaoExistir("Fritas", "🍟");
    }

    private void adicionarSeNaoExistir(String nome, String icone) {
        repository.findByNomeIgnoreCase(nome)
            .orElseGet(() -> repository.save(new Acompanhamento(nome, icone)));
    }

    @GetMapping("/api/acompanhamentos")
    public ResponseEntity<List<Acompanhamento>> listarTodosParaCardapio() {
        return ResponseEntity.ok(repository.findAllByOrderByIdAsc());
    }

    @GetMapping("/api/admin/acompanhamentos")
    public ResponseEntity<List<Acompanhamento>> listarTodos() {
        return ResponseEntity.ok(repository.findAllByOrderByIdAsc());
    }

    @PutMapping("/api/admin/acompanhamentos/{id}")
    public ResponseEntity<Acompanhamento> atualizarDisponibilidade(
            @PathVariable Long id,
            @RequestBody Acompanhamento dados) {
        return repository.findById(id)
            .map(acompanhamento -> {
                acompanhamento.setDisponivel(dados.isDisponivel());
                return ResponseEntity.ok(repository.save(acompanhamento));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
