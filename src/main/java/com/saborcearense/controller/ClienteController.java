package com.saborcearense.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    @Autowired
    private PedidoRepository pedidoRepository;

    // Busca o histórico de pedidos de um cliente usando o número de telefone dele como filtro
    @GetMapping("/{telefone}")
    public ResponseEntity<List<Pedido>> buscarHistoricoPorTelefone(@PathVariable String telefone) {
        List<Pedido> pedidosDoCliente = pedidoRepository.findByTelefone(telefone.trim());

        if (pedidosDoCliente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(pedidosDoCliente);
    }
}
