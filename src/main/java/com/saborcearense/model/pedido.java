package com.saborcearense.model;

public class Pedido {
    private String id;
    private String status; // Ex: PENDENTE, CONFIRMADO, A_CAMINHO

    public Pedido(String id) {
        this.id = id;
        this.status = "PENDENTE";
    }

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
