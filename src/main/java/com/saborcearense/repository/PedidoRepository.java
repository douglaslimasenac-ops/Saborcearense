package com.saborcearense.repository;

import com.saborcearense.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    boolean existsByNumeroPedido(Long numeroPedido);

    @Transactional(readOnly = true)
    java.util.Optional<Pedido> findByNumeroPedido(Long numeroPedido);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pedido p where p.id = :id")
    java.util.Optional<Pedido> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pedido p where p.numeroPedido = :numero")
    java.util.Optional<Pedido> findByNumeroPedidoForUpdate(@Param("numero") Long numero);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pedido p where p.pagamentoReferencia = :referencia")
    java.util.Optional<Pedido> findByPagamentoReferenciaForUpdate(@Param("referencia") String referencia);
    @Transactional(readOnly = true)
    List<Pedido> findByStatusNotIgnoreCase(String status);

    @Transactional(readOnly = true)
    List<Pedido> findByStatusNotIn(java.util.Collection<String> statuses);

    @Transactional(readOnly = true)
    List<Pedido> findByStatusOrderByDataCriacaoDesc(String status);

    @Transactional(readOnly = true)
    List<Pedido> findByTelefone(String telefone);

    @Transactional(readOnly = true)
    List<Pedido> findByImpressaoPendenteTrueOrderByIdAsc();

    @Modifying
    @Transactional
    @Query("delete from Pedido p where p.status in :statuses and p.dataCriacao < :limite "
            + "and (p.impressaoPendente = false or p.impressaoPendente is null)")
    int deleteByStatusInAndDataCriacaoBefore(@Param("statuses") List<String> statuses,
            @Param("limite") LocalDateTime limite);
}
