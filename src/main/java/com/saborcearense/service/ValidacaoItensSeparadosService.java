package com.saborcearense.service;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.saborcearense.model.Pedido;
import com.saborcearense.repository.BairroEntregaRepository;
import com.saborcearense.repository.ItemCardapioRepository;

@Service
public class ValidacaoItensSeparadosService {
    private static final BigDecimal VALOR_SEPARADO = new BigDecimal("2.00");
    private final ObjectMapper mapper;
    private final ItemCardapioRepository produtos;
    private final BairroEntregaRepository bairros;

    public ValidacaoItensSeparadosService(ObjectMapper mapper, ItemCardapioRepository produtos,
            BairroEntregaRepository bairros) {
        this.mapper = mapper;
        this.produtos = produtos;
        this.bairros = bairros;
    }

    public void validar(Pedido pedido) {
        if (pedido.getItens() == null) return;
        JsonNode itens;
        try {
            itens = mapper.readTree(pedido.getItens());
        } catch (JsonProcessingException | IllegalArgumentException erro) {
            throw invalido("Itens do pedido inválidos");
        }
        if (itens == null || !itens.isArray()) return;
        boolean temSeparados = false;
        for (JsonNode item : itens) {
            JsonNode separados = item.get("itensSeparados");
            if (separados != null && (!separados.isArray() || !separados.isEmpty())) temSeparados = true;
            if (item.path("nome").asText().contains(" — SEPARADO: ")) temSeparados = true;
        }
        if (!temSeparados) return;

        BigDecimal subtotal = BigDecimal.ZERO;
        for (JsonNode item : itens) {
            if (!item.isObject() || !item.path("quantidade").canConvertToInt()
                    || !item.path("quantidade").isIntegralNumber()) throw invalido("Quantidade inválida");
            int quantidade = item.path("quantidade").intValue();
            if (quantidade < 1 || quantidade > 100) throw invalido("Quantidade inválida");
            String idTexto = item.path("id").asText().split("-", 2)[0];
            long id;
            try { id = Long.parseLong(idTexto); }
            catch (NumberFormatException erro) { throw invalido("Produto inválido"); }
            var produto = produtos.findById(id).orElseThrow(() -> invalido("Produto não encontrado"));
            if (!produto.isDisponivel()) throw invalido("Produto indisponível");
            JsonNode separados = item.get("itensSeparados");
            if (separados == null && item.path("nome").asText().contains(" — SEPARADO: ")) {
                throw invalido("Itens separados ausentes");
            }
            int quantidadeSeparados = 0;
            if (separados != null) {
                if (!separados.isArray() || separados.size() > 20) throw invalido("Itens separados inválidos");
                Set<String> nomes = new HashSet<>();
                for (JsonNode separado : separados) {
                    if (!separado.isTextual()) throw invalido("Item separado inválido");
                    String nome = separado.textValue();
                    if (nome.isBlank() || !nome.equals(nome.trim()) || nome.length() > 60
                            || nome.matches(".*[,;/\\r\\n].*")
                            || !nomes.add(nome.toLowerCase(Locale.ROOT))) throw invalido("Item separado inválido");
                }
                quantidadeSeparados = separados.size();
                if (quantidadeSeparados == 0 && item.path("nome").asText().contains(" — SEPARADO: ")) {
                    throw invalido("Itens separados ausentes");
                }
                if (quantidadeSeparados > 0) {
                    String sufixo = " — SEPARADO: " + String.join(", ",
                            java.util.stream.StreamSupport.stream(separados.spliterator(), false)
                                    .map(JsonNode::textValue).toList());
                    if (!item.path("nome").asText().endsWith(sufixo)) throw invalido("Descrição dos itens separados inválida");
                }
            }
            BigDecimal adicional = VALOR_SEPARADO.multiply(BigDecimal.valueOf(quantidadeSeparados));
            BigDecimal preco = produto.getPreco().add(adicional);
            if (!item.path("preco").isNumber() || item.path("preco").decimalValue().compareTo(preco) != 0) {
                throw invalido("Preço do produto atualizado ou inválido");
            }
            if (quantidadeSeparados > 0) ((ObjectNode) item).put("adicionalSeparados", adicional);
            else ((ObjectNode) item).remove("adicionalSeparados");
            subtotal = subtotal.add(preco.multiply(BigDecimal.valueOf(quantidade)));
        }
        BigDecimal taxa = BigDecimal.ZERO;
        if (!pedido.getEndereco().trim().regionMatches(true, 0, "RETIRADA", 0, "RETIRADA".length())) {
            String bairro = pedido.getBairroEntrega();
            if (bairro == null || !pedido.getEndereco().contains(", Bairro: " + bairro + " (Ref:")) {
                throw invalido("Bairro de entrega inválido");
            }
            taxa = bairros.findByNomeIgnoreCase(bairro).orElseThrow(() -> invalido("Bairro de entrega não encontrado")).getTaxa();
        }
        if (pedido.getValorTotal().compareTo(subtotal.add(taxa)) != 0) throw invalido("Total do pedido inválido");
        try {
            pedido.setItens(mapper.writeValueAsString(itens));
        } catch (JsonProcessingException erro) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível registrar os itens do pedido", erro);
        }
    }

    private ResponseStatusException invalido(String mensagem) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
    }
}
