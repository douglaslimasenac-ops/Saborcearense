package com.saborcearense.model;

import java.time.DayOfWeek;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "pratos")
public class Prato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private String descricao;
    private Double preco;
    private boolean esgotado = false; // Novo campo: começa como disponível (false)
    
    @Enumerated(EnumType.STRING)
    private DayOfWeek diaDaSemana;

    public Prato() {}

    public Prato(String nome, String descricao, Double preco, DayOfWeek diaDaSemana) {
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.diaDaSemana = diaDaSemana;
        this.esgotado = false;
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getDescricao() { return descricao; }
    public Double getPreco() { return preco; }
    public boolean isEsgotado() { return esgotado; } // Getter do novo campo
    public DayOfWeek getDiaDaSemana() { return diaDaSemana; }
    
    public void setNome(String nome) { this.nome = nome; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public void setPreco(Double preco) { this.preco = preco; }
    public void setEsgotado(boolean esgotado) { this.esgotado = esgotado; } // Setter do novo campo
    public void setDiaDaSemana(DayOfWeek diaDaSemana) { this.diaDaSemana = diaDaSemana; }
}
