package com.saborcearense.repository;

import com.saborcearense.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    List<Pedido> findByStatusNotIgnoreCase(String status);

    List<Pedido> findByTelefone(String telefone);
}
