package com.saborcearense.delivery.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ItemCardapio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private Double preco;
    private String categoria;
    private String diasDisponiveis; // Ex: "SABADO", "SEGUNDA,TERCA,QUARTA", "TODOS"

    public ItemCardapio() {}

    public ItemCardapio(String nome, Double preco, String categoria, String diasDisponiveis) {
        this.nome = nome;
        this.preco = preco;
        this.categoria = categoria;
        this.diasDisponiveis = diasDisponiveis;
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Double getPreco() { return preco; }
    public void setPreco(Double preco) { this.preco = preco; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getDiasDisponiveis() { return diasDisponiveis; }
    public void setDiasDisponiveis(String diasDisponiveis) { this.diasDisponiveis = diasDisponiveis; }
}
