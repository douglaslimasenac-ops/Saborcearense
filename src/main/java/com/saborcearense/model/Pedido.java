package com.saborcearense.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "pedidos")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_pedido", unique = true)
    private Long numeroPedido;

    @Column(nullable = false)
    private String status = "RECEBIDO"; // RECEBIDO, PREPARO, ENTREGA, ENTREGUE

    @NotBlank
    private String clienteNome;
    @NotBlank
    private String telefone;
    @NotBlank
    private String endereco;
    @NotBlank
    private String formaPagamento;
    @NotNull
    @DecimalMin(value = "0.00")
    private BigDecimal valorTotal;
    @Lob
    private String itens;
    @Column(length = 500)
    private String observacao;
    private LocalDateTime dataCriacao = LocalDateTime.now();

    public Pedido() {}

    // --- GETTERS E SETTERS ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getNumeroPedido() { return numeroPedido; }
    public void setNumeroPedido(Long numeroPedido) { this.numeroPedido = numeroPedido; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getClienteNome() { return clienteNome; }
    public void setClienteNome(String clienteNome) { this.clienteNome = clienteNome; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }
    public BigDecimal getValorTotal() { return valorTotal; }
    public void setValorTotal(BigDecimal valorTotal) { this.valorTotal = valorTotal; }
    public String getItens() { return itens; }
    public void setItens(String itens) { this.itens = itens; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
}
