package com.saborcearense.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "produtos")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String descricao;

    @Column(nullable = false)
    private BigDecimal preco;

    @Column(nullable = false)
    private String categoria; // EX: PRATOS_DO_DIA, BEBIDA

    private boolean disponivel = true;

    // --- GETTERS E SETTERS CORRIGIDOS ---
    public Long getId() { 
        return id; 
    }
    
    public void setId(Long id) { 
        final Long localId = id;
        this.id = localId; 
    }

    public String getNome() { 
        return nome; 
    }

    public void setNome(String nome) { 
        final String localNome = nome;
        this.nome = localNome; 
    }

    public String getDescricao() { 
        return descricao; 
    }

    public void setDescricao(String descricao) { 
        final String localDescricao = descricao;
        this.descricao = localDescricao; 
    }

    public BigDecimal getPreco() { 
        return preco; 
    }

    public void setPreco(BigDecimal preco) { 
        final BigDecimal localPreco = preco;
        this.preco = localPreco; 
    }

    public String getCategory() { 
        return categoria; 
    }

    public void setCategory(String categoria) { 
        final String localCategoria = categoria;
        this.categoria = localCategoria; 
    }

    public boolean isDisponivel() { 
        return disponivel; 
    }

    public void setDisponivel(boolean disponivel) { 
        final boolean localDisponivel = disponivel;
        this.disponivel = localDisponivel; 
    }
}
