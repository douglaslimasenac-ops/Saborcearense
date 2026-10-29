package com.saborcearense.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DatabaseUrlEnvironmentPostProcessorTest {
    private final DatabaseUrlEnvironmentPostProcessor processador = new DatabaseUrlEnvironmentPostProcessor();

    @Test
    void converteCredenciaisDeUrlNeonSemPerderParametros() {
        MockEnvironment ambiente = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgresql://usuario:senha%40teste%2B1@db.example/teste?sslmode=require");
        processador.postProcessEnvironment(ambiente, null);
        assertEquals("jdbc:postgresql://db.example/teste?sslmode=require", ambiente.getProperty("spring.datasource.url"));
        assertEquals("usuario", ambiente.getProperty("spring.datasource.username"));
        assertEquals("senha@teste+1", ambiente.getProperty("spring.datasource.password"));
        assertEquals("org.postgresql.Driver", ambiente.getProperty("spring.datasource.driver-class-name"));
    }

    @Test
    void aceitaJdbcEParametrosDeAutenticacao() {
        MockEnvironment ambiente = new MockEnvironment()
                .withProperty("DATABASE_URL", "jdbc:postgresql://db.example/teste?user=usuario&password=teste%2B1");
        processador.postProcessEnvironment(ambiente, null);
        assertEquals("usuario", ambiente.getProperty("spring.datasource.username"));
        assertEquals("teste+1", ambiente.getProperty("spring.datasource.password"));
        assertEquals("jdbc:postgresql://db.example/teste?user=usuario&password=teste%2B1",
                ambiente.getProperty("spring.datasource.url"));
    }

    @Test
    void respeitaUrlSpringEIgnoraValoresVazios() {
        MockEnvironment ambiente = new MockEnvironment().withProperty("DATABASE_URL", "postgresql://db.example/teste")
                .withProperty("SPRING_DATASOURCE_URL", "jdbc:h2:mem:teste");
        processador.postProcessEnvironment(ambiente, null);
        assertNull(ambiente.getProperty("spring.datasource.url"));
        ambiente.setProperty("SPRING_DATASOURCE_URL", "");
        processador.postProcessEnvironment(ambiente, null);
        assertEquals("jdbc:postgresql://db.example/teste", ambiente.getProperty("spring.datasource.url"));
    }

    @Test
    void rejeitaUrlInvalidaSemExporSeuConteudo() {
        MockEnvironment ambiente = new MockEnvironment().withProperty("DATABASE_URL", "url-invalida");
        var erro = assertThrows(IllegalArgumentException.class,
                () -> processador.postProcessEnvironment(ambiente, null));
        assertEquals("DATABASE_URL deve ser uma URL PostgreSQL válida", erro.getMessage());
    }
}
