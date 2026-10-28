package com.saborcearense.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.saborcearense.model.BairroEntrega;

public interface BairroEntregaRepository extends JpaRepository<BairroEntrega, Long> {
    List<BairroEntrega> findAllByOrderByNomeAsc();
    Optional<BairroEntrega> findByNomeIgnoreCase(String nome);
}
