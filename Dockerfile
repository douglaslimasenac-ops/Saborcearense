# Passo 1: Instala o Maven e compila o código Java
FROM maven:3.8.4-openjdk-17 AS build
COPY . .
RUN mvn clean package -DskipTests

# Passo 2: Instala apenas o Java leve para rodar o sistema no servidor
FROM openjdk:17-jdk-slim
COPY --from=build /target/delivery-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
