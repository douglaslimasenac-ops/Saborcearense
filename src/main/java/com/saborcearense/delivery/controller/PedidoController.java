package com.saborcearense.delivery.controller;

import com.saborcearense.delivery.model.Pedido;
import com.saborcearense.delivery.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    @Autowired
    private PedidoRepository repository;

    @PostMapping
    public Pedido salvarPedido(@RequestBody Pedido pedido) {
        return repository.save(pedido);
    }
}
