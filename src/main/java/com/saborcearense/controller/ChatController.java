package com.saborcearense.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.saborcearense.config.WebSocketConfig;
import com.saborcearense.model.ChatMensagem;
import com.saborcearense.repository.ChatMensagemRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.socket.TextMessage;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatMensagemRepository repository;

    public ChatController(ChatMensagemRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{numeroPedido}")
    public List<ChatMensagem> listar(@PathVariable Long numeroPedido) {
        return repository.findByNumeroPedidoOrderByDataCriacaoAsc(numeroPedido);
    }

    @PostMapping("/{numeroPedido}")
    public ResponseEntity<ChatMensagem> enviarCliente(
            @PathVariable Long numeroPedido, @RequestBody Map<String, String> dados) {
        return salvar(numeroPedido, dados, "CLIENTE");
    }

    @GetMapping("/admin")
    public List<ChatMensagem> listarAdmin() {
        return repository.findAllByOrderByDataCriacaoAsc();
    }

    @PostMapping("/admin/{numeroPedido}")
    public ResponseEntity<ChatMensagem> enviarAdmin(
            @PathVariable Long numeroPedido, @RequestBody Map<String, String> dados) {
        return salvar(numeroPedido, dados, "RESTAURANTE");
    }

    @DeleteMapping("/admin/{numeroPedido}")
    public ResponseEntity<Void> encerrar(@PathVariable Long numeroPedido) {
        repository.deleteByNumeroPedido(numeroPedido);
        transmitir(Map.of("tipo", "CHAT_ENCERRADO", "numeroPedido", numeroPedido));
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<ChatMensagem> salvar(Long numeroPedido, Map<String, String> dados, String remetente) {
        String texto = dados == null ? null : dados.get("mensagem");
        if (numeroPedido == null || texto == null || texto.trim().isEmpty() || texto.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A mensagem deve ter entre 1 e 1000 caracteres");
        }
        ChatMensagem mensagem = new ChatMensagem();
        mensagem.setNumeroPedido(numeroPedido);
        mensagem.setMensagem(texto.trim());
        mensagem.setRemetente(remetente);
        mensagem.setDataCriacao(LocalDateTime.now());
        ChatMensagem salva = repository.save(mensagem);
        transmitir(Map.of("tipo", "CHAT_MENSAGEM", "numeroPedido", numeroPedido));
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    private void transmitir(Map<String, Object> evento) {
        try {
            String json = new ObjectMapper().writeValueAsString(evento);
            for (org.springframework.web.socket.WebSocketSession sessao : WebSocketConfig.getSessoes()) {
                if (sessao.isOpen()) {
                    sessao.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception erro) {
            System.err.println("Erro ao notificar chat: " + erro.getMessage());
        }
    }
}
