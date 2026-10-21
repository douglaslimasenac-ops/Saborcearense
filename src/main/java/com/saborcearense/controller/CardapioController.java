package com.saborcearense.controller;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.saborcearense.model.Produto;
import com.saborcearense.repository.ItemCardapioRepository;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/cardapio")
@CrossOrigin(origins = "*", allowedHeaders = "*") 
public class CardapioController {

    @Autowired
    private ItemCardapioRepository repository;

    @PostConstruct
    public void inicializarCardapio() {
        if (repository.count() == 0) {
            // Carga inicial automática de segurança caso o banco esteja vazio
            repository.save(criarProdutoInicial("Grelhado de Frango", "FRANGO", 22.00));
            repository.save(criarProdutoInicial("Frango à Milanesa", "FRANGO", 24.00));
            repository.save(criarProdutoInicial("Frango à Parmegiana", "FRANGO", 26.00));
            repository.save(criarProdutoInicial("Fígado Acebolado", "CARNE", 20.00));
            repository.save(criarProdutoInicial("Bife Acebolado", "CARNE", 28.00));
            repository.save(criarProdutoInicial("Bife à Milanesa", "CARNE", 30.00));
            repository.save(criarProdutoInicial("Bife à Parmegiana", "CARNE", 32.00));
            repository.save(criarProdutoInicial("Contra Filé", "CARNE", 32.00));
            repository.save(criarProdutoInicial("Filé de Peixe", "OUTROS", 26.00));
            repository.save(criarProdutoInicial("Carré", "OUTROS", 22.00));
            repository.save(criarProdutoInicial("Linguiça de Churrasco", "OUTROS", 20.00));
            repository.save(criarProdutoInicial("Omelete", "OUTROS", 22.00));
            repository.save(criarProdutoInicial("Bolo de Pote", "SOBREMESA", 8.00));
            repository.save(criarProdutoInicial("Mini Pudim", "SOBREMESA", 8.00));
            repository.save(criarProdutoInicial("Mousse", "SOBREMESA", 8.00));
            repository.save(criarProdutoInicial("Pavê de Chocolate", "SOBREMESA", 8.00));
        }
    }

    private Produto criarProdutoInicial(String nome, String categoria, double preco) {
        Produto p = new Produto();
        p.setNome(nome);
        p.setCategoria(categoria);
        p.setPreco(java.math.BigDecimal.valueOf(preco));
        p.setDescricao("DELICIOSO " + nome.toUpperCase());
        p.setDisponivel(true);
        return p;
    }

    @GetMapping
    public List<Produto> listarCardapio() {
        return repository.findAll();
    }

    @PostMapping("/novo")
    public Produto adicionarProduto(@RequestBody Produto novoProduto) {
        return repository.save(novoProduto);
    }

    @PutMapping("/{id}/editar")
    public ResponseEntity<Produto> editarProduto(@PathVariable Long id, @RequestBody Produto itemAtualizado) {
        return repository.findById(id).map(item -> {
            item.setNome(itemAtualizado.getNome());
            item.setPreco(itemAtualizado.getPreco());
            item.setDescricao(itemAtualizado.getDescricao() != null ? itemAtualizado.getDescricao().toUpperCase() : "");
            item.setCategoria(itemAtualizado.getCategoria() != null ? itemAtualizado.getCategoria().toUpperCase() : "OUTROS");
            return ResponseEntity.ok(repository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/deletar")
    public ResponseEntity<Void> deletarProduto(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/status-disponibilidade")
    public ResponseEntity<Produto> alternarDisponibilidade(@PathVariable Long id, @RequestParam boolean esgotado) {
        return repository.findById(id).map(item -> {
            item.setDisponivel(!esgotado); 
            return ResponseEntity.ok(repository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status")
    public Map<String, Object> obterStatusFuncionamento() {
        DayOfWeek dia = LocalDate.now().getDayOfWeek();
        LocalTime hora = LocalTime.now();
        boolean diaValido = (dia != DayOfWeek.SUNDAY);
        boolean horaValida = (!hora.isBefore(LocalTime.of(11, 30)) && !hora.isAfter(LocalTime.of(15, 0)));
        boolean aberto = diaValido && horaValida;

        return Map.of(
            "aberto", aberto,
            "mensagem", aberto ? "🟢 Aberto - Faça seu pedido!" : "🔴 Fechado - Atendimento de Seg a Sáb, 11:30 às 15h"
        );
    }
}
