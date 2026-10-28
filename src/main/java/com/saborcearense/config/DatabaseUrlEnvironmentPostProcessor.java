package com.saborcearense.config;

import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()
                || environment.getProperty("SPRING_DATASOURCE_URL") != null) {
            return;
        }

        String jdbcUrl = databaseUrl.startsWith("jdbc:")
                ? databaseUrl
                : "jdbc:" + databaseUrl;

        environment.getPropertySources().addFirst(new MapPropertySource(
            "databaseUrlEnvironmentPostProcessor",
            Map.of(
                "spring.datasource.url", jdbcUrl,
                "spring.datasource.driver-class-name", "org.postgresql.Driver",
                "spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect"
            )
        ));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
