package com.saborcearense.delivery.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Pedido {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String cliente;
    private String resumoItens;
    private String tipoEntrega; // "Entrega" ou "Retirada"
    private String bairro;
    private Double taxaEntrega;
    private Double total;
    private LocalDateTime dataHora = LocalDateTime.now();

    // Getters e Setters
    public Long getId() { return id; }
    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }
    public String getResumoItens() { return resumoItens; }
    public void setResumoItens(String resumoItens) { this.resumoItens = resumoItens; }
    public String getTipoEntrega() { return tipoEntrega; }
    public void setTipoEntrega(String tipoEntrega) { this.tipoEntrega = tipoEntrega; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public Double getTaxaEntrega() { return taxaEntrega; }
    public void setTaxaEntrega(Double taxaEntrega) { this.taxaEntrega = taxaEntrega; }
    public Double getTotal() { return total; }
    public void setTotal(Double total) { this.total = total; }
    public LocalDateTime getDataHora() { return dataHora; }
}
