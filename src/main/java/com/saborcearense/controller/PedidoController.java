package com.saborcearense.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    @Autowired
    private PedidoRepository pedidoRepository;

    @GetMapping("/ativos")
    public ResponseEntity<List<Pedido>> listarAtivos() {
        return ResponseEntity.ok(pedidoRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Pedido> criarPedido(@RequestBody Pedido novoPedido) {
        novoPedido.setStatus("RECEBIDO");
        Pedido pedidoSalvo = pedidoRepository.save(novoPedido);
        return ResponseEntity.ok(pedidoSalvo);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Pedido> atualizarStatus(@PathVariable Long id, @RequestBody Pedido dadosAtualizados) {
        return pedidoRepository.findById(id)
            .map(pedido -> {
                pedido.setStatus(dadosAtualizados.getStatus());
                Pedido atualizado = pedidoRepository.save(pedido);
                return ResponseEntity.ok(atualizado);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
