package com.saborcearense.delivery.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Cliente {
    @Id
    private String telefone; // O telefone será a chave única do cliente
    private String nome;
    private String endereco;

    public Cliente() {}

    public Cliente(String telefone, String nome, String endereco) {
        this.telefone = telefone;
        this.nome = nome;
        this.endereco = endereco;
    }

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
}
