package com.saborcearense.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.model.Produto;
import com.saborcearense.repository.ItemCardapioRepository;

import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/cardapio")
@CrossOrigin(origins = "*")
public class CardapioController {

    @Autowired
    private ItemCardapioRepository repository;

    @PostConstruct
    public void inicializarCardapio() {
        // Se a tabela do banco embutido iniciar vazia, o Java insere os produtos iniciais de forma segura
        if (repository.count() == 0) {
            repository.save(criarProdutoInicial("Grelhado de Frango", "FRANGO", 22.00));
            repository.save(criarProdutoInicial("Frango à Milanesa", "FRANGO", 24.00));
            repository.save(criarProdutoInicial("Cerveja Artesanal Alcaçuz", "BEBIDA", 12.00));
            repository.save(criarProdutoInicial("Suco Natural de Caju", "BEBIDA", 7.50));
            repository.save(criarProdutoInicial("Refrigerante Lata", "BEBIDA", 5.00));
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

    // 🌟 REINSERIDO: Este método é obrigatório para alimentar a função carregarCardapio() do JavaScript
    @GetMapping
    public List<Produto> listarCardapio() {
        return repository.findAll();
    }

    @GetMapping("/status")
    public Map<String, String> obterStatusLoja() {
        Map<String, String> status = new HashMap<>();
        // O JavaScript procura a palavra "fechado" para mudar a cor. 
        // Retornando "Aberto", a bolinha ficará verde automaticamente.
        status.put("mensagem", "Loja Aberta - Sabor Cearense");
        return status;
    }
}
