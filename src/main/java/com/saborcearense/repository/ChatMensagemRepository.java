package com.saborcearense.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import com.saborcearense.model.ChatMensagem;

public interface ChatMensagemRepository extends JpaRepository<ChatMensagem, Long> {
    List<ChatMensagem> findByNumeroPedidoOrderByDataCriacaoAsc(Long numeroPedido);
    List<ChatMensagem> findAllByOrderByDataCriacaoAsc();

    @Transactional
    void deleteByNumeroPedido(Long numeroPedido);
}
