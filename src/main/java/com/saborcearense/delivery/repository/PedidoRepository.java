package com.saborcearense.delivery.repository;

import com.saborcearense.delivery.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {
}
