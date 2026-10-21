package com.saborcearense.delivery.controller;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.saborcearense.delivery.model.ItemCardapio;
import com.saborcearense.delivery.repository.ItemCardapioRepository;

import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/cardapio")
@CrossOrigin(origins = "*", allowedHeaders = "*") 
public class CardapioController {

    @Autowired
    private ItemCardapioRepository repository;

    @PostConstruct
    public void inicializarCardapio() {
        if(repository.count() == 0) {
            // Pratos do Dia
            repository.save(new ItemCardapio("Baião de Dois Simples", 22.00, "PRATOS_DO_DIA", "SEGUNDA"));
            repository.save(new ItemCardapio("Frango Grelhado Ceará", 20.00, "PRATOS_DO_DIA", "SEGUNDA"));
            repository.save(new ItemCardapio("Carne de Sol Acebolada", 28.50, "PRATOS_DO_DIA", "TERCA"));
            repository.save(new ItemCardapio("Escondidinho de Frango", 21.00, "PRATOS_DO_DIA", "TERCA"));
            repository.save(new ItemCardapio("Feijoada Cearense", 26.00, "PRATOS_DO_DIA", "QUARTA"));
            repository.save(new ItemCardapio("Filé de Merluza Empanado", 23.00, "PRATOS_DO_DIA", "QUARTA"));
            repository.save(new ItemCardapio("Panelada Tradicional", 25.00, "PRATOS_DO_DIA", "QUINTA"));
            repository.save(new ItemCardapio("Bife a Cavalo", 24.00, "PRATOS_DO_DIA", "QUINTA"));
            repository.save(new ItemCardapio("Vatapá de Frango", 22.00, "PRATOS_DO_DIA", "SEXTA"));
            repository.save(new ItemCardapio("Carne de Sol com Queijo", 30.00, "PRATOS_DO_DIA", "SEXTA"));
            repository.save(new ItemCardapio("Mão de Vaca Cozida", 27.00, "PRATOS_DO_DIA", "SABADO"));
            repository.save(new ItemCardapio("Baião de Dois Especial", 25.00, "PRATOS_DO_DIA", "SABADO"));

            // Pratos Fixos nas Categorias
            repository.save(new ItemCardapio("Grelhado de Frango", 22.00, "FRANGO", "TODOS"));
            repository.save(new ItemCardapio("Frango à Milanesa", 24.00, "FRANGO", "TODOS"));
            repository.save(new ItemCardapio("Bife Acebolado", 28.00, "CARNE", "TODOS"));
            
            // Bebidas e Sobremesas
            repository.save(new ItemCardapio("Coca-Cola Lata", 6.00, "BEBIDA", "TODOS"));
            repository.save(new ItemCardapio("Bolo de Pote", 8.00, "SOBREMESA", "TODOS"));
        }
    }

    @GetMapping
    public List<ItemCardapio> listarDoDia() {
        String diaAtual = LocalDate.now().getDayOfWeek().toString();
        String diaFiltro = switch (diaAtual) {
            case "MONDAY" -> "SEGUNDA";
            case "TUESDAY" -> "TERCA";
            case "WEDNESDAY" -> "QUARTA";
            case "THURSDAY" -> "QUINTA";
            case "FRIDAY" -> "SEXTA";
            case "SATURDAY" -> "SABADO";
            default -> "DOMINGO";
        };

        // Retorna os itens fixos ("TODOS") ou os pratos rotativos específicos do dia de hoje
        return repository.findAll().stream()
                .filter(item -> item.getDiasDisponiveis() != null && (
                       item.getDiasDisponiveis().trim().equalsIgnoreCase("TODOS") || 
                       item.getDiasDisponiveis().trim().equalsIgnoreCase(diaFiltro)
                ))
                .collect(Collectors.toList());
    }

    @GetMapping("/status")
    public Map<String, Object> obterStatusFuncionamento() {
        DayOfWeek dia = LocalDate.now().getDayOfWeek();
        LocalTime hora = LocalTime.now();
        boolean diaValido = (dia != DayOfWeek.SUNDAY);
        boolean horaValida = (!hora.isBefore(LocalTime.of(11, 30)) && !hora.isAfter(LocalTime.of(15, 0)));
        boolean aberto = diaValido && horaValida;

        return Map.of(
            "aberto", aberto,
            "mensagem", aberto ? "🟢 Aberto - Faça seu pedido!" : "🔴 Fechado - Atendimento de Seg a Sáb, 11:30 às 15h"
        );
    }
}
