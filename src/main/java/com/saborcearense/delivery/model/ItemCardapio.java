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

    // Construtor Padrão (Obrigatório para o JPA/Hibernate)
    public ItemCardapio() {}

    // Construtor Completo
    public ItemCardapio(String nome, String descricao, Double preco, boolean esgotado) {
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.esgotado = esgotado;
    }

    // Métodos Getters e Setters de todos os atributos
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
}
