package com.saborcearense.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Digits;

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
    @Digits(integer = 8, fraction = 2)
    @DecimalMin(value = "0.00")
    @Column(precision = 10, scale = 2)
    private BigDecimal trocoPara;
    @Lob
    private String itens;
    @Column(length = 500)
    private String observacao;
    private LocalDateTime dataCriacao = LocalDateTime.now();
    @Lob
    @JsonIgnore
    private String comprovantePix;
    @Column(length = 100)
    private String comprovantePixTipo;
    @Column(length = 255)
    private String comprovantePixNome;

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
    public BigDecimal getTrocoPara() { return trocoPara; }
    public void setTrocoPara(BigDecimal trocoPara) { this.trocoPara = trocoPara; }
    @JsonIgnore
    @AssertTrue(message = "O valor para troco deve ser maior ou igual ao total e só pode ser informado para pagamento em dinheiro")
    public boolean isTrocoValido() {
        return trocoPara == null || ("Dinheiro".equalsIgnoreCase(formaPagamento)
                && valorTotal != null && trocoPara.compareTo(valorTotal) >= 0);
    }
    public String getItens() { return itens; }
    public void setItens(String itens) { this.itens = itens; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
    public String getComprovantePix() { return comprovantePix; }
    public void setComprovantePix(String comprovantePix) { this.comprovantePix = comprovantePix; }
    public String getComprovantePixTipo() { return comprovantePixTipo; }
    public void setComprovantePixTipo(String comprovantePixTipo) { this.comprovantePixTipo = comprovantePixTipo; }
    public String getComprovantePixNome() { return comprovantePixNome; }
    public void setComprovantePixNome(String comprovantePixNome) { this.comprovantePixNome = comprovantePixNome; }
    public boolean isComprovantePixDisponivel() { return comprovantePix != null && !comprovantePix.isBlank(); }
}
