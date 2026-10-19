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
@CrossOrigin(origins = "*")
public class CardapioController {

    @Autowired
    private ItemCardapioRepository repository;

    @PostConstruct
    public void inicializarCardapio() {
        if(repository.count() == 0) {
            // Pratos do Dia
            repository.save(new ItemCardapio("Churrasco Misto", 30.00, "PRATOS_DO_DIA", "SABADO"));
            repository.save(new ItemCardapio("Bobó de Camarão", 35.00, "PRATOS_DO_DIA", "SABADO"));
            repository.save(new ItemCardapio("Virado à Paulista", 25.00, "PRATOS_DO_DIA", "SEGUNDA"));
            repository.save(new ItemCardapio("Feijoada Especial", 32.00, "PRATOS_DO_DIA", "QUARTA"));
            repository.save(new ItemCardapio("Peixada Cearense", 35.00, "PRATOS_DO_DIA", "SEXTA"));

            // Pratos Fixos
            repository.save(new ItemCardapio("Grelhado", 22.00, "FRANGO", "TODOS"));
            repository.save(new ItemCardapio("À milanesa", 24.00, "FRANGO", "TODOS"));
            repository.save(new ItemCardapio("À parmegiana", 26.00, "FRANGO", "TODOS"));
            repository.save(new ItemCardapio("Fígado acebolado", 20.00, "CARNE", "TODOS"));
            repository.save(new ItemCardapio("Bife acebolado", 28.00, "CARNE", "TODOS"));
            repository.save(new ItemCardapio("Bife à milanesa", 30.00, "CARNE", "TODOS"));
            repository.save(new ItemCardapio("Bife à parmegiana", 32.00, "CARNE", "TODOS"));
            repository.save(new ItemCardapio("Contra filé", 32.00, "CARNE", "TODOS"));
            repository.save(new ItemCardapio("Filé de peixe", 26.00, "OUTROS", "TODOS"));
            repository.save(new ItemCardapio("Carré", 22.00, "OUTROS", "TODOS"));
            repository.save(new ItemCardapio("Linguiça de churrasco", 20.00, "OUTROS", "TODOS"));
            repository.save(new ItemCardapio("Omelete", 22.00, "OUTROS", "TODOS"));
            
            // BEBIDAS (Nova Categoria)
            repository.save(new ItemCardapio("Coca-Cola Lata", 6.00, "BEBIDA", "TODOS"));
            repository.save(new ItemCardapio("Guaraná Antarctica Lata", 5.50, "BEBIDA", "TODOS"));
            repository.save(new ItemCardapio("Suco de Laranja 500ml", 8.00, "BEBIDA", "TODOS"));
            repository.save(new ItemCardapio("Água Mineral sem Gás", 3.50, "BEBIDA", "TODOS"));

            // Sobremesas
            repository.save(new ItemCardapio("Bolo de pote", 8.00, "SOBREMESA", "TODOS"));
            repository.save(new ItemCardapio("Mini pudim", 8.00, "SOBREMESA", "TODOS"));
            repository.save(new ItemCardapio("Mousse", 8.00, "SOBREMESA", "TODOS"));
            repository.save(new ItemCardapio("Pavê de chocolate", 8.00, "SOBREMESA", "TODOS"));
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

        return repository.findAll().stream()
                .filter(item -> item.getDiasDisponiveis().equals("TODOS") || item.getDiasDisponiveis().contains(diaFiltro))
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
