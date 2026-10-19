package com.saborcearense.delivery.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.delivery.model.Cliente;
import com.saborcearense.delivery.repository.ClienteRepository;

@RestController
@RequestMapping("/api/clientes")
@CrossOrigin(origins = "*")
public class ClienteController {

    @Autowired
    private ClienteRepository repository;

    @PostMapping
    public Cliente salvarCliente(@RequestBody Cliente cliente) {
        return repository.save(cliente);
    }

    @GetMapping("/{telefone}")
    public ResponseEntity<Cliente> buscarPorTelefone(@PathVariable String telefone) {
        return repository.findById(telefone)
                .map(cliente -> ResponseEntity.ok().body(cliente))
                .orElse(ResponseEntity.notFound().build());
    }
}
