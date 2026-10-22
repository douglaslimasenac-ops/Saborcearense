package com.saborcearense.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
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
        if (repository.count() == 0) {
            System.out.println("Sabor Cearense: Populando base de dados com o cardápio oficial...");

            // --- PRATOS DO DIA ---
            repository.save(criarProdutoInicial("Frango com Quiabo", "PRATOS_DO_DIA", 24.00, "Delicioso frango caipira com quiabo fresco."));
            repository.save(criarProdutoInicial("Carne Assada", "PRATOS_DO_DIA", 28.00, "Carne assada de panela macia e suculenta."));
            repository.save(criarProdutoInicial("Costela com Batata", "PRATOS_DO_DIA", 33.00, "Costela bovina cozida com batatas macias."));
            repository.save(criarProdutoInicial("Frango Assado", "PRATOS_DO_DIA", 24.00, "Tradicional frango assado bem temperado."));
            repository.save(criarProdutoInicial("Dobradinha", "PRATOS_DO_DIA", 24.00, "Dobradinha tradicional bem temperada com feijão branco."));
            repository.save(criarProdutoInicial("Pernil Assado", "PRATOS_DO_DIA", 22.00, "Fatias de pernil assado temperado nas ervas."));
            repository.save(criarProdutoInicial("Tilápia com Baião", "PRATOS_DO_DIA", 25.00, "Filé de tilápia grelhado acompanhado de baião de dois."));
            repository.save(criarProdutoInicial("Jardineira", "PRATOS_DO_DIA", 25.00, "Carne cozida com legumes variados do dia."));
            repository.save(criarProdutoInicial("Strogonoff", "PRATOS_DO_DIA", 24.00, "Strogonoff de frango cremoso acompanhado de batata palha."));
            repository.save(criarProdutoInicial("Língua com Batata", "PRATOS_DO_DIA", 22.00, "Língua de boi ao molho com batatas cozidas."));
            repository.save(criarProdutoInicial("Mocotó", "PRATOS_DO_DIA", 24.00, "Caldo de mocotó tradicional nordestino legítimo."));
            repository.save(criarProdutoInicial("Almôndega", "PRATOS_DO_DIA", 25.00, "Almôndegas caseiras ao molho de tomate."));
            repository.save(criarProdutoInicial("Rabada", "PRATOS_DO_DIA", 30.00, "Rabada robusta cozida lentamente com agrião."));
            repository.save(criarProdutoInicial("Churrasco Misto", "PRATOS_DO_DIA", 30.00, "Espeto misto de carnes grelhadas na chapa."));
            repository.save(criarProdutoInicial("Peixe ao Molho", "PRATOS_DO_DIA", 30.00, "Filé de peixe cozido no leite de coco."));
            repository.save(criarProdutoInicial("Carré à Mineira", "PRATOS_DO_DIA", 24.00, "Carré suíno grelhado com couve refogada."));

            // --- PRATOS PRINCIPAIS: FRANGO ---
            repository.save(criarProdutoInicial("Frango Grelhado", "FRANGO", 22.00, "Filé de peito de frango grelhado na chapa."));
            repository.save(criarProdutoInicial("Frango à Milanesa", "FRANGO", 24.00, "Filé de frango empanado super crocante."));
            repository.save(criarProdutoInicial("Frango à Parmegiana", "FRANGO", 26.00, "Filé de frango coberto com queijo e molho de tomate."));

            // --- PRATOS PRINCIPAIS: CARNE ---
            repository.save(criarProdutoInicial("Fígado Acebolado", "CARNE", 20.00, "Iscas de fígado macias aceboladas na chapa."));
            repository.save(criarProdutoInicial("Bife Acebolado", "CARNE", 28.00, "Bife de alcatra acebolado no ponto certo."));
            repository.save(criarProdutoInicial("Bife à Parmegiana", "CARNE", 32.00, "Bife empanado coberto com muito queijo derretido."));
            repository.save(criarProdutoInicial("Bife à Milanesa", "CARNE", 30.00, "Bife de carne empanado tradicional."));
            repository.save(criarProdutoInicial("Contra Bife", "CARNE", 32.00, "Bife de contra filé premium grelhado."));
            
            // --- PRATOS PRINCIPAIS: OUTROS ---
            repository.save(criarProdutoInicial("Filé de Peixe", "OUTROS", 26.00, "Filé de peixe grelhado leve e saudável."));
            repository.save(criarProdutoInicial("Carré", "OUTROS", 22.00, "Porção de carré suíno temperado da casa."));
            repository.save(criarProdutoInicial("Linguiça de Churrasco", "OUTROS", 20.00, "Linguiça toscana grelhada acebolada."));
            repository.save(criarProdutoInicial("Omelete", "OUTROS", 22.00, "Omelete completo feito com ovos frescos."));

            // --- BEBIDAS: REFRIGERANTE LATA ---
            repository.save(criarProdutoInicial("Coca-Cola Comum Lata", "BEBIDA", 7.00, "Refrigerante lata 350ml."));
            repository.save(criarProdutoInicial("Coca-Cola Zero Lata", "BEBIDA", 7.00, "Refrigerante lata zero açúcar 350ml."));
            repository.save(criarProdutoInicial("Guaraná Antarctica Lata", "BEBIDA", 6.00, "Refrigerante lata 350ml."));
            repository.save(criarProdutoInicial("Guaraná Antarctica Zero Lata", "BEBIDA", 6.00, "Refrigerante lata zero 350ml."));
            repository.save(criarProdutoInicial("Fanta Laranja Lata", "BEBIDA", 6.00, "Refrigerante lata 350ml."));
            repository.save(criarProdutoInicial("Fanta Uva Lata", "BEBIDA", 6.00, "Refrigerante lata 350ml."));
            repository.save(criarProdutoInicial("Água Tônica Lata", "BEBIDA", 6.00, "Lata 350ml."));
            repository.save(criarProdutoInicial("Sprite Lata", "BEBIDA", 6.00, "Refrigerante lata 350ml."));

            // --- BEBIDAS: CERVEJAS ---
            repository.save(criarProdutoInicial("Cerveja Antarctica Latão", "BEBIDA", 7.00, "Latão 473ml."));
            repository.save(criarProdutoInicial("Cerveja Brahma Latão", "BEBIDA", 7.00, "Latão 473ml."));
            repository.save(criarProdutoInicial("Cerveja Heineken Latão", "BEBIDA", 9.00, "Latão 473ml."));
            repository.save(criarProdutoInicial("Cerveja Império Latão", "BEBIDA", 7.00, "Latão 473ml."));

            // --- BEBIDAS: REFRIGERANTE 2 LITROS ---
            repository.save(criarProdutoInicial("Coca-Cola Comum 2L", "BEBIDA", 14.00, "Garrafa familiar de 2 litros."));
            repository.save(criarProdutoInicial("Coca-Cola Zero 2L", "BEBIDA", 14.00, "Garrafa familiar de 2 litros zero açúcar."));
            repository.save(criarProdutoInicial("Guaraná Antarctica 2L", "BEBIDA", 12.00, "Garrafa familiar de 2 litros."));
            repository.save(criarProdutoInicial("Guaraná Antarctica Zero 2L", "BEBIDA", 12.00, "Garrafa familiar de 2 litros zero."));
            repository.save(criarProdutoInicial("Fanta Laranja 2L", "BEBIDA", 12.00, "Garrafa familiar de 2 litros."));
            repository.save(criarProdutoInicial("Fanta Uva 2L", "BEBIDA", 12.00, "Garrafa familiar de 2 litros."));
            // --- BEBIDAS: DIVERSOS ---
            repository.save(criarProdutoInicial("Água sem Gás", "BEBIDA", 3.00, "Garrafa 500ml."));
            repository.save(criarProdutoInicial("Água com Gás", "BEBIDA", 4.00, "Garrafa 500ml com gás."));
            repository.save(criarProdutoInicial("Água 1.5L", "BEBIDA", 6.00, "Garrafa grande de 1.5 litros."));
            repository.save(criarProdutoInicial("Guaraviton", "BEBIDA", 6.00, "Garrafa de 450ml."));
            repository.save(criarProdutoInicial("Guaravita", "BEBIDA", 3.00, "Copo tradicional lacrado."));
            repository.save(criarProdutoInicial("Gatorade", "BEBIDA", 8.00, "Bebida isotônica 500ml."));
            repository.save(criarProdutoInicial("H2OH! Limão", "BEBIDA", 7.00, "Garrafa de 500ml."));
            repository.save(criarProdutoInicial("H2OH! Limoneto", "BEBIDA", 7.00, "Garrafa de 500ml sabor limoneto."));
            repository.save(criarProdutoInicial("Monster Energy", "BEBIDA", 14.00, "Lata de energético 473ml."));
            repository.save(criarProdutoInicial("Red Bull", "BEBIDA", 12.00, "Lata de energético 250ml."));
            repository.save(criarProdutoInicial("Vinho no Copo", "BEBIDA", 6.00, "Copo de vinho tradicional da casa."));

            // --- BEBIDAS: SUCOS ---
            repository.save(criarProdutoInicial("Suco de Laranja Copo", "BEBIDA", 7.00, "Suco natural em copo individual."));
            repository.save(criarProdutoInicial("Suco de Limão Copo", "BEBIDA", 5.00, "Suco natural em copo individual."));
            repository.save(criarProdutoInicial("Suco de Laranja Jarra", "BEBIDA", 25.00, "Jarra de suco natural para compartilhar."));
            repository.save(criarProdutoInicial("Suco de Limão Jarra", "BEBIDA", 15.00, "Jarra de suco natural para compartilhar."));

            // --- SOBREMESAS ---
            repository.save(criarProdutoInicial("Pudim de Leite", "SOBREMESA", 8.00, "Fatia do delicioso pudim de leite caseiro."));

            System.out.println("Sabor Cearense: Carga inicial oficial configurada com sucesso!");
        } else {
            System.out.println("Sabor Cearense: Banco já populado. Ignorando carga inicial.");
        }
    }

    private Produto criarProdutoInicial(String nome, String categoria, double preco, String descricao) {
        Produto p = new Produto();
        p.setNome(nome);
        p.setCategoria(categoria);
        p.setPreco(java.math.BigDecimal.valueOf(preco));
        p.setDescricao(descricao);
        p.setDisponivel(true);
        return p;
    }

    // 🌐 LISTAR CARDÁPIO
    @org.springframework.web.bind.annotation.GetMapping
    public List<Produto> listarCardapio() {
        return repository.findAll();
    }

    // 🟢/🔴 STATUS DE FUNCIONAMENTO DA LOJA
    @org.springframework.web.bind.annotation.GetMapping("/status")
    public Map<String, String> obterStatusLoja() {
        Map<String, String> status = new HashMap<>();
        status.put("mensagem", "Loja Aberta - Sabor Cearense");
        return status;
    }

    // ➕ ADICIONAR NOVO PRODUTO VIA PAINEL ADMIN
    @org.springframework.web.bind.annotation.PostMapping
    public Produto adicionarItem(@org.springframework.web.bind.annotation.RequestBody Produto novoProduto) {
        if (novoProduto.getDescricao() == null) {
            novoProduto.setDescricao("Item adicionado via painel.");
        }
        return repository.save(novoProduto);
    }

    // 💰 ATUALIZAR PREÇO RÁPIDO DO INPUT
    @org.springframework.web.bind.annotation.PutMapping("/{id}/preco")
    public org.springframework.http.ResponseEntity<Void> atualizarPreco(
            @org.springframework.web.bind.annotation.PathVariable Long id, 
            @org.springframework.web.bind.annotation.RequestParam Double preco) {
        
        return repository.findById(id).map(produto -> {
            produto.setPreco(java.math.BigDecimal.valueOf(preco));
            repository.save(produto);
            return org.springframework.http.ResponseEntity.ok().<Void>build();
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    // 🔄 ALTERAR DISPONIBILIDADE (DISPONÍVEL / ESGOTADO) - Nome do RequestParam ajustado para "disponivel" para sincronizar com o front-end
    @org.springframework.web.bind.annotation.PutMapping("/{id}/disponibilidade")
    public org.springframework.http.ResponseEntity<Void> atualizarDisponibilidade(
            @org.springframework.web.bind.annotation.PathVariable Long id, 
            @org.springframework.web.bind.annotation.RequestParam(name = "disponivel") Boolean disponible) {
        
        return repository.findById(id).map(produto -> {
            produto.setDisponivel(disponible);
            repository.save(produto);
            return org.springframework.http.ResponseEntity.ok().<Void>build();
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    // 🗑️ DELETAR ITEM PERMANENTEMENTE
    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<Void> deletarItem(@org.springframework.web.bind.annotation.PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return org.springframework.http.ResponseEntity.ok().build();
        }
        return org.springframework.http.ResponseEntity.notFound().build();
    }
}
