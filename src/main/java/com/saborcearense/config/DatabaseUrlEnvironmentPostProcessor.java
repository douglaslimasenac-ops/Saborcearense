package com.saborcearense.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
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
        String springDatasourceUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()
                || (springDatasourceUrl != null && !springDatasourceUrl.isBlank())) {
            return;
        }

        String postgresUrl = databaseUrl.startsWith("jdbc:") ? databaseUrl.substring(5) : databaseUrl;
        URI uri;
        try {
            uri = URI.create(postgresUrl);
        } catch (IllegalArgumentException erro) {
            throw new IllegalArgumentException("DATABASE_URL deve ser uma URL PostgreSQL válida");
        }
        if (!"postgresql".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            throw new IllegalArgumentException("DATABASE_URL deve ser uma URL PostgreSQL válida");
        }

        Map<String, Object> properties = new HashMap<>();
        String rawUserInfo = uri.getRawUserInfo();
        if (rawUserInfo != null) {
            String[] credentials = rawUserInfo.split(":", 2);
            properties.put("spring.datasource.username", decode(credentials[0]));
            if (credentials.length == 2) {
                properties.put("spring.datasource.password", decode(credentials[1]));
            }
            int authorityStart = postgresUrl.indexOf("//") + 2;
            postgresUrl = postgresUrl.substring(0, authorityStart)
                    + postgresUrl.substring(authorityStart + rawUserInfo.length() + 1);
        } else if (uri.getRawQuery() != null) {
            for (String parameter : uri.getRawQuery().split("&")) {
                String[] pair = parameter.split("=", 2);
                if (pair.length != 2) continue;
                if ("user".equals(pair[0])) {
                    properties.put("spring.datasource.username", decode(pair[1]));
                } else if ("password".equals(pair[0])) {
                    properties.put("spring.datasource.password", decode(pair[1]));
                }
            }
        }

        properties.put("spring.datasource.url", "jdbc:" + postgresUrl);
        properties.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
        properties.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
        environment.getPropertySources().addFirst(new MapPropertySource(
                "databaseUrlEnvironmentPostProcessor", properties));
    }

    private String decode(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
