package com.saborcearense.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.saborcearense.model.Acompanhamento;

public interface AcompanhamentoRepository extends JpaRepository<Acompanhamento, Long> {
    Optional<Acompanhamento> findByNomeIgnoreCase(String nome);
    List<Acompanhamento> findAllByOrderByIdAsc();
}
