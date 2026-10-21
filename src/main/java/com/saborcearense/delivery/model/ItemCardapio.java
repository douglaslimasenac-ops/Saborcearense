package com.saborcearense.delivery.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "pratos")
public class ItemCardapio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private String descricao;
    private Double preco;
    private boolean esgotado = false; 
    private String diasDisponiveis;

    // Construtor obrigatório para o banco de dados
    public ItemCardapio() {}

    // Construtor customizado para bater exatamente com a ordem do CardapioController
    public ItemCardapio(String nome, Double preco, String descricao, String diasDisponiveis) {
        this.nome = nome;
        this.preco = preco;
        this.descricao = descricao;
        this.diasDisponiveis = diasDisponiveis;
        this.esgotado = false; // Todo item inicia disponível por padrão
    }

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public Double getPreco() { return preco; }
    public void setPreco(Double preco) { this.preco = preco; }

    public boolean isEsgotado() { return esgotado; }
    public void setEsgotado(boolean esgotado) { this.esgotado = esgotado; }

    public String getDiasDisponiveis() { return diasDisponiveis; }
    public void setDiasDisponiveis(String diasDisponiveis) { this.diasDisponiveis = diasDisponiveis; }
}
