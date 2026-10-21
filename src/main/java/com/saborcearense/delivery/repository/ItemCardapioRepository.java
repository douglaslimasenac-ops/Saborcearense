package com.saborcearense.delivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.saborcearense.model.Produto;

@Repository
public interface ItemCardapioRepository extends JpaRepository<Produto, Long> {
    // O JpaRepository já gera automaticamente os métodos principais de banco de dados
}
