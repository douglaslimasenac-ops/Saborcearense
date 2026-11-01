package com.saborcearense.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.mock.env.MockEnvironment;

import com.saborcearense.DeliveryApplication;

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

    @Test
    void springBootCarregaProcessadorDuranteInicializacao() {
        AtomicReference<String> url = new AtomicReference<>();
        AtomicReference<String> usuario = new AtomicReference<>();
        AtomicReference<String> senha = new AtomicReference<>();
        SpringApplication app = new SpringApplication(DeliveryApplication.class);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.addListeners((ApplicationListener<ApplicationEnvironmentPreparedEvent>) evento -> {
            url.set(evento.getEnvironment().getProperty("spring.datasource.url"));
            usuario.set(evento.getEnvironment().getProperty("spring.datasource.username"));
            senha.set(evento.getEnvironment().getProperty("spring.datasource.password"));
            throw new PararAntesDeConectar();
        });
        assertThrows(PararAntesDeConectar.class,
                () -> app.run("--DATABASE_URL=postgresql://usuario:senha@db.example/teste?sslmode=require"));
        assertEquals("jdbc:postgresql://db.example/teste?sslmode=require", url.get());
        assertEquals("usuario", usuario.get());
        assertEquals("senha", senha.get());
    }

    private static class PararAntesDeConectar extends RuntimeException {
    }
}
