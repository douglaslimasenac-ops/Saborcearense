package com.saborcearense.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "funcionamento_restaurante")
public class FuncionamentoRestaurante {
    @Id
    private Long id;
    private boolean aberto;

    protected FuncionamentoRestaurante() {
    }

    public FuncionamentoRestaurante(boolean aberto) {
        this.id = 1L;
        this.aberto = aberto;
    }

    public boolean isAberto() {
        return aberto;
    }
}
