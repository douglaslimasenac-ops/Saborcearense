package com.saborcearense.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.saborcearense.model.BairroEntrega;
import com.saborcearense.repository.BairroEntregaRepository;
import com.saborcearense.service.InicializacaoBairros;

import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api")
public class BairroEntregaController {

    private final BairroEntregaRepository repository;
    private final InicializacaoBairros inicializacao;

    public BairroEntregaController(BairroEntregaRepository repository, InicializacaoBairros inicializacao) {
        this.repository = repository;
        this.inicializacao = inicializacao;
    }

    @PostConstruct
    void inicializarBairros() {
        inicializacao.inicializar();
    }

    @GetMapping("/bairros")
    public List<BairroEntrega> listarParaCheckout() {
        return repository.findAllByOrderByNomeAsc();
    }

    @GetMapping("/admin/bairros")
    public List<BairroEntrega> listarParaAdmin() {
        return repository.findAllByOrderByNomeAsc();
    }

    @PostMapping("/admin/bairros")
    public ResponseEntity<BairroEntrega> criar(@RequestBody BairroEntrega dados) {
        validar(dados);
        if (repository.findByNomeIgnoreCase(dados.getNome().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bairro já cadastrado");
        }
        dados.setNome(dados.getNome().trim());
        dados.setTaxa(dados.getTaxa().setScale(2));
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(dados));
    }

    @PutMapping("/admin/bairros/{id}")
    public ResponseEntity<BairroEntrega> atualizar(@PathVariable Long id, @RequestBody BairroEntrega dados) {
        validar(dados);
        if (repository.findByNomeIgnoreCase(dados.getNome().trim())
                .filter(outro -> !outro.getId().equals(id))
                .isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esse bairro já está cadastrado");
        }
        return repository.findById(id)
            .map(bairro -> {
                bairro.setNome(dados.getNome().trim());
                bairro.setTaxa(dados.getTaxa().setScale(2));
                return ResponseEntity.ok(repository.save(bairro));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/admin/bairros/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void validar(BairroEntrega dados) {
        if (dados == null || dados.getNome() == null || dados.getNome().trim().isEmpty()
                || dados.getTaxa() == null || dados.getTaxa().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe bairro e uma taxa válida");
        }
    }
}
