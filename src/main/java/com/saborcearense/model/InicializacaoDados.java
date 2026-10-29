package com.saborcearense.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "inicializacao_dados")
public class InicializacaoDados {
    @Id
    private String chave;

    protected InicializacaoDados() {
    }

    public InicializacaoDados(String chave) {
        this.chave = chave;
    }
}
