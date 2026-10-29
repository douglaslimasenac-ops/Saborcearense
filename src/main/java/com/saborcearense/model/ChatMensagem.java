package com.saborcearense.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "chat_mensagens")
public class ChatMensagem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long numeroPedido;

    @NotBlank
    private String mensagem;

    private String remetente;
    private LocalDateTime dataCriacao = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getNumeroPedido() { return numeroPedido; }
    public void setNumeroPedido(Long numeroPedido) { this.numeroPedido = numeroPedido; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getRemetente() { return remetente; }
    public void setRemetente(String remetente) { this.remetente = remetente; }
    public LocalDateTime getDataCriacao() { return dataCriacao; }
    public void setDataCriacao(LocalDateTime dataCriacao) { this.dataCriacao = dataCriacao; }
}
