package com.saborcearense.delivery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "pedidos")
public class Pedido {

    @Id
    @Column(length = 6, nullable = false, unique = true)
    private String id;

    private String status;

    // Construtor padrão (Obrigatório para o JPA/Hibernate)
    public Pedido() {
    }

    // Construtor customizado para facilitar a criação
    public Pedido(String id, String status) {
        this.id = id;
        this.status = status;
    }

    // --- GETTERS AND SETTERS ---
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
