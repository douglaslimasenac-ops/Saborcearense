package com.saborcearense.controller;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/armazenamento")
public class ArmazenamentoController {
    private final DataSource dataSource;

    public ArmazenamentoController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public Map<String, String> consultar() throws SQLException {
        try (Connection conexao = dataSource.getConnection()) {
            String url = conexao.getMetaData().getURL();
            String tipo = url != null && url.startsWith("jdbc:postgresql:") ? "postgresql"
                    : url != null && url.startsWith("jdbc:h2:mem:") ? "temporario" : "nao-confirmado";
            return Map.of("tipo", tipo);
        }
    }
}
