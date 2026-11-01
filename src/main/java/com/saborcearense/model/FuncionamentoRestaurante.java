package com.saborcearense.model;

import java.time.Instant;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "funcionamento_restaurante")
public class FuncionamentoRestaurante {
    @Id
    private Long id;
    private boolean aberto;
    private Instant manualAte;

    protected FuncionamentoRestaurante() {
    }

    public FuncionamentoRestaurante(boolean aberto, Instant manualAte) {
        this.id = 1L;
        this.aberto = aberto;
        this.manualAte = manualAte;
    }

    public boolean isAberto() {
        return aberto;
    }

    public Instant getManualAte() {
        return manualAte;
    }

}
