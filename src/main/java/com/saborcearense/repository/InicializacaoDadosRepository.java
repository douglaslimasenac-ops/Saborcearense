package com.saborcearense.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.saborcearense.model.InicializacaoDados;

public interface InicializacaoDadosRepository extends JpaRepository<InicializacaoDados, String> {
}
