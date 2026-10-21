package com.saborcearense.delivery.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.delivery.model.ItemCardapio;
import com.saborcearense.delivery.repository.ItemCardapioRepository;

@RestController
@RequestMapping("/api/admin/pratos")
@CrossOrigin(origins = "*") 
public class AdminPratoController {

    @Autowired 
    private ItemCardapioRepository itemCardapioRepository; 

    @GetMapping
    public ResponseEntity<List<ItemCardapio>> listarTodos() {
        return ResponseEntity.ok(itemCardapioRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<ItemCardapio> adicionar(@RequestBody ItemCardapio novoPrato) {
        return ResponseEntity.ok(itemCardapioRepository.save(novoPrato));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemCardapio> atualizar(@PathVariable Long id, @RequestBody ItemCardapio pratoAtualizado) {
        return itemCardapioRepository.findById(id)
            .map(prato -> {
                prato.setNome(pratoAtualizado.getNome());
                prato.setDescricao(pratoAtualizado.getDescricao());
                prato.setPreco(pratoAtualizado.getPreco());
                prato.setEsgotado(pratoAtualizado.isEsgotado()); 
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
}
