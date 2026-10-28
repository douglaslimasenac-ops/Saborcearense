package com.saborcearense.repository;

import com.saborcearense.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    boolean existsByNumeroPedido(Long numeroPedido);

    java.util.Optional<Pedido> findByNumeroPedido(Long numeroPedido);
    List<Pedido> findByStatusNotIgnoreCase(String status);

    List<Pedido> findByStatusNotIn(java.util.Collection<String> statuses);

    List<Pedido> findByTelefone(String telefone);

    @Modifying
    @Transactional
    int deleteByStatusInAndDataCriacaoBefore(List<String> statuses, LocalDateTime limite);
}
