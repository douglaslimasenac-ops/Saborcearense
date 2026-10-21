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
        // Limpa o banco antigo para carregar o cardápio oficial novo sem duplicações
        repository.deleteAll();
        
        // --- CATEGORIA: FRANGO (FIXOS) ---
        repository.save(new ItemCardapio("Grelhado de Frango", 22.00, "FRANGO", "TODOS"));
        repository.save(new ItemCardapio("Frango à Milanesa", 24.00, "FRANGO", "TODOS"));
        repository.save(new ItemCardapio("Frango à Parmegiana", 26.00, "FRANGO", "TODOS"));

        // --- CATEGORIA: CARNE (FIXOS) ---
        repository.save(new ItemCardapio("Fígado Acebolado", 20.00, "CARNE", "TODOS"));
        repository.save(new ItemCardapio("Bife Acebolado", 28.00, "CARNE", "TODOS"));
        repository.save(new ItemCardapio("Bife à Milanesa", 30.00, "CARNE", "TODOS"));
        repository.save(new ItemCardapio("Bife à Parmegiana", 32.00, "CARNE", "TODOS"));
        repository.save(new ItemCardapio("Contra Filé", 32.00, "CARNE", "TODOS"));

        // --- CATEGORIA: OUTROS (FIXOS) ---
        repository.save(new ItemCardapio("Filé de Peixe", 26.00, "OUTROS", "TODOS"));
        repository.save(new ItemCardapio("Carré", 22.00, "OUTROS", "TODOS"));
        repository.save(new ItemCardapio("Linguiça de Churrasco", 20.00, "OUTROS", "TODOS"));
        repository.save(new ItemCardapio("Omelete", 22.00, "OUTROS", "TODOS"));
        
        // --- CATEGORIA: SOBREMESAS (FIXOS) ---
        repository.save(new ItemCardapio("Bolo de Pote", 8.00, "SOBREMESA", "TODOS"));
        repository.save(new ItemCardapio("Mini Pudim", 8.00, "SOBREMESA", "TODOS"));
        repository.save(new ItemCardapio("Mousse", 8.00, "SOBREMESA", "TODOS"));
        repository.save(new ItemCardapio("Pavê de Chocolate", 8.00, "SOBREMESA", "TODOS"));
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

        // Retorna todos os itens fixos ("TODOS") e os pratos variáveis cadastrados para o dia de hoje
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
