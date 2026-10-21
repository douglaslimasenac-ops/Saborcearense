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
            repository.save(new ItemCardapio("Baião de Dois Simples", 22.00, "Arroz, feijão de corda, queijo coalho e tempero verde.", "SEGUNDA"));
            repository.save(new ItemCardapio("Frango Grelhado Ceará", 20.00, "Peito de frango com purê de macaxeira e arroz.", "SEGUNDA"));
            repository.save(new ItemCardapio("Carne de Sol Acebolada", 28.50, "Acompanha baião de dois, macaxeira frita e paçoca.", "TERCA"));
            repository.save(new ItemCardapio("Escondidinho de Frango", 21.00, "Purê de macaxeira cremoso com recheio de frango.", "TERCA"));
            repository.save(new ItemCardapio("Feijoada Cearense", 26.00, "Feijão preto com carnes selecionadas, arroz e couve.", "QUARTA"));
            repository.save(new ItemCardapio("Filé de Merluza Empanado", 23.00, "Peixe crocante com arroz branco e salada.", "QUARTA"));
            repository.save(new ItemCardapio("Panelada Tradicional", 25.00, "Prato típico bem tempo, acompanha arroz e cuscuz.", "QUINTA"));
            repository.save(new ItemCardapio("Bife a Cavalo", 24.00, "Bife de alcatra com ovo frito, arroz e feijão.", "QUINTA"));
            repository.save(new ItemCardapio("Vatapá de Frango", 22.00, "Vatapá cremoso legítimo, arroz branco e salada.", "SEXTA"));
            repository.save(new ItemCardapio("Carne de Sol com Queijo", 30.00, "Carne de sol coberta com queijo coalho derretido.", "SEXTA"));
            repository.save(new ItemCardapio("Mão de Vaca Cozida", 27.00, "Caldo grosso e forte com pirão e arroz branco.", "SABADO"));
            repository.save(new ItemCardapio("Baião de Dois Especial", 25.00, "Baião completo com bacon, linguiça e carne de sol.", "SABADO"));

            // Pratos Fixos nas Categorias
            repository.save(new ItemCardapio("Grelhado de Frango", 22.00, "Acompanha arroz, feijão e farofa", "TODOS"));
            repository.save(new ItemCardapio("Frango à Milanesa", 24.00, "Acompanha arroz, feijão e farofa", "TODOS"));
            repository.save(new ItemCardapio("Bife Acebolado", 28.00, "Acompanha arroz, feijão e farofa", "TODOS"));
            
            // Bebidas e Sobremesas
            repository.save(new ItemCardapio("Coca-Cola Lata", 6.00, "Bebida gelada", "TODOS"));
            repository.save(new ItemCardapio("Bolo de Pote", 8.00, "Sobremesa do dia", "TODOS"));
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
                .filter(item -> item.getDiasDisponiveis() != null && (
                       item.getDiasDisponiveis().equals("TODOS") || 
                       item.getDiasDisponiveis().contains(diaFiltro) ||
                       // Garante que se o item for de uma seção fixa, ele também passe no filtro
                       item.getDescricao().equals("FRANGO") || 
                       item.getDescricao().equals("CARNE") || 
                       item.getDescricao().equals("OUTROS") || 
                       item.getDescricao().equals("BEBIDA") || 
                       item.getDescricao().equals("SOBREMESA")
                ))
                .collect(Collectors.toList());
}