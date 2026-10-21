package com.saborcearense.model;

import java.time.DayOfWeek;
import jakarta.persistence.*;

@Entity
@Table(name = "pratos")
public class Prato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String nome;
    
    private String descricao;
    
    @Column(nullable = false)
    private Double preco;
    
    private boolean esgotado = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "dia_da_semana")
    private DayOfWeek diaDaSemana;

    public Prato() {}

    public Prato(String nome, String descricao, Double preco, DayOfWeek diaDaSemana) {
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.diaDaSemana = diaDaSemana;
        this.esgotado = false;
    }

    // --- GETTERS E SETTERS ---
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
    public DayOfWeek getDiaDaSemana() { return diaDaSemana; }
    public void setDiaDaSemana(DayOfWeek diaDaSemana) { this.diaDaSemana = diaDaSemana; }
}
