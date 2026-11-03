package com.saborcearense.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;

@SpringBootTest(properties = {
        "app.admin.password=teste-local",
        "spring.datasource.url=jdbc:h2:mem:pedido_transacao;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.jpa.properties.hibernate.session_factory.statement_inspector=com.saborcearense.controller.PedidoTransacaoTest$InspecaoTransacao"
})
class PedidoTransacaoTest {
    @Autowired private PedidoRepository pedidos;

    public static class InspecaoTransacao implements StatementInspector {
        private static final List<Boolean> transacoes = new ArrayList<>();

        @Override
        public String inspect(String sql) {
            if (sql.toLowerCase().contains("from pedidos")) {
                transacoes.add(TransactionSynchronizationManager.isActualTransactionActive());
            }
            return sql;
        }
    }

    @Test
    void consultasDePedidosLeemCamposGrandesDentroDeTransacao() {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(9876L);
        pedido.setClienteNome("Cliente teste");
        pedido.setTelefone("000000000");
        pedido.setEndereco("RETIRADA");
        pedido.setFormaPagamento("Pix");
        pedido.setValorTotal(BigDecimal.TEN);
        pedido.setItens("[{\"nome\":\"Prato\"}]");
        pedidos.save(pedido);

        InspecaoTransacao.transacoes.clear();
        pedidos.findByStatusNotIn(List.of("ENTREGUE", "CANCELADO"));
        pedidos.findByNumeroPedido(9876L);
        pedidos.findByTelefone("000000000");
        pedidos.findByStatusNotIgnoreCase("ENTREGUE");

        assertEquals(List.of(true, true, true, true), InspecaoTransacao.transacoes);
    }
}
