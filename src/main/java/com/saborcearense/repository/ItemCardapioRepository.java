package com.saborcearense.repository;

import com.saborcearense.model.Produto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemCardapioRepository extends JpaRepository<Produto, Long> {
    boolean existsByNomeIgnoreCase(String nome);

    // O JpaRepository já cria os métodos save(), findAll(), findById() e deleteById() automaticamente para a tabela de produtos
}
