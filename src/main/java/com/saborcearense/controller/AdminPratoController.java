package com.saborcearense.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.saborcearense.model.Produto;
import com.saborcearense.repository.ItemCardapioRepository;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/pratos")
public class AdminPratoController {

    @Autowired 
    private ItemCardapioRepository itemCardapioRepository; 

    @GetMapping
    public ResponseEntity<List<Produto>> listarTodos() {
        return ResponseEntity.ok(itemCardapioRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Produto> adicionar(@Valid @RequestBody Produto novoPrato) {
        validarPrato(novoPrato);
        return ResponseEntity.ok(itemCardapioRepository.save(novoPrato));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Produto> atualizar(@PathVariable Long id, @Valid @RequestBody Produto pratoAtualizado) {
        validarPrato(pratoAtualizado);
        return itemCardapioRepository.findById(id)
            .map(prato -> {
                prato.setNome(pratoAtualizado.getNome());
                prato.setDescricao(pratoAtualizado.getDescricao());
                prato.setPreco(pratoAtualizado.getPreco());
                prato.setCategoria(pratoAtualizado.getCategoria());
                prato.setDiaSemana(pratoAtualizado.getDiaSemana());
                prato.setImagemUrl(pratoAtualizado.getImagemUrl());
                prato.setDisponivel(pratoAtualizado.isDisponivel()); 
                return ResponseEntity.ok(itemCardapioRepository.save(prato));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        if (itemCardapioRepository.existsById(id)) {
            itemCardapioRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private void validarPrato(Produto prato) {
        if ("PRATOS_DO_DIA".equalsIgnoreCase(prato.getCategoria())
                && (prato.getDiaSemana() == null || prato.getDiaSemana().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe o dia da semana para um prato do dia");
        }
    }
}
