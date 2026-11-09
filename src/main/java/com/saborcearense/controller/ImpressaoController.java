package com.saborcearense.controller;

import java.util.List;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.net.URI;
import java.util.Arrays;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;
import com.saborcearense.security.DispositivoImpressaoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/impressao")
public class ImpressaoController {
    private final PedidoRepository pedidos;
    private final boolean habilitada;
    private final DispositivoImpressaoService dispositivos;
    private final ObjectMapper mapper;
    private final List<String> origensPermitidas;

    public ImpressaoController(PedidoRepository pedidos,
            @Value("${app.impressao-automatica.enabled:false}") boolean habilitada,
            @Value("${app.allowed-origins:http://localhost:8080}") String origens,
            DispositivoImpressaoService dispositivos, ObjectMapper mapper) {
        this.pedidos = pedidos;
        this.habilitada = habilitada;
        this.dispositivos = dispositivos;
        this.mapper = mapper;
        this.origensPermitidas = Arrays.stream(origens.split(",")).map(String::trim).toList();
    }

    @GetMapping("/configuracao")
    public java.util.Map<String, Boolean> configuracao() {
        return java.util.Map.of("habilitada", habilitada);
    }

    @PostMapping("/instalador")
    public ResponseEntity<ByteArrayResource> instalador(@RequestBody InstaladorRequest pedido) throws IOException {
        String site = pedido.site();
        URI uri;
        try {
            uri = URI.create(site);
        } catch (IllegalArgumentException | NullPointerException erro) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endereço do site inválido", erro);
        }
        boolean local = "localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()) || "[::1]".equals(uri.getHost());
        if (!origensPermitidas.contains(site) || uri.getUserInfo() != null || uri.getQuery() != null
                || uri.getFragment() != null || (uri.getPath() != null && !uri.getPath().isEmpty())
                || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && local))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endereço do site não permitido para instalação");
        }
        String codigo = dispositivos.gerarCodigo();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            for (String nome : List.of("agente.ps1", "interface.ps1", "icone.ico", "marca.png", "instalar.cmd", "leia-me.txt")) {
                zip.putNextEntry(new ZipEntry(nome));
                try (var entrada = new ClassPathResource("impressao/" + nome).getInputStream()) {
                    entrada.transferTo(zip);
                }
                zip.closeEntry();
            }
            zip.putNextEntry(new ZipEntry("vinculacao.json"));
            zip.write(mapper.writeValueAsBytes(Map.of("codigo", codigo, "site", site)));
            zip.closeEntry();
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sabor-cearense-impressao.zip\"")
                .body(new ByteArrayResource(bytes.toByteArray()));
    }

    @DeleteMapping("/dispositivos")
    public ResponseEntity<Void> revogarDispositivos() {
        dispositivos.revogarTodos();
        return ResponseEntity.noContent().build();
    }

    public record InstaladorRequest(String site) {}

    @GetMapping("/pendentes")
    public List<Pedido> pendentes() {
        return pedidos.findByImpressaoPendenteTrueOrderByIdAsc();
    }

    @PostMapping("/{id}/confirmar")
    @Transactional
    public ResponseEntity<Void> confirmar(@PathVariable Long id) {
        return pedidos.findByIdForUpdate(id).map(pedido -> {
            pedido.setImpressaoPendente(false);
            return ResponseEntity.noContent().<Void>build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
