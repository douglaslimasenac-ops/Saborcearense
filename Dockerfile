# Passo 1: Usa a imagem oficial estável do Maven com Java 17 para compilar
FROM maven:3.8.8-eclipse-temurin-17 AS build
COPY . .
RUN mvn clean package -DskipTests

# Passo 2: Usa a imagem oficial leve do Eclipse Temurin para rodar o sistema
FROM eclipse-temurin:17-jre-alpine
COPY --from=build /target/delivery-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
