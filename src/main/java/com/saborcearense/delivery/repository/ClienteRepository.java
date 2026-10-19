package com.saborcearense.delivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.saborcearense.delivery.model.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente, String> {
}
