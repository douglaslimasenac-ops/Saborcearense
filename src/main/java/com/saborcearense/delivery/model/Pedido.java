package com.saborcearense.delivery.model;

public class Pedido {
    private String id;
    private String status;

    // Construtor padrão (Vazio) exigido pelo Hibernate/Spring
    public Pedido() {
    }

    // --- GETTERS E SETTERS CRÍTICOS ---
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
