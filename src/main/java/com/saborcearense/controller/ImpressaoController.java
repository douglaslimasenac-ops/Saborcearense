package com.saborcearense.controller;

import java.util.List;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import com.saborcearense.model.Pedido;
import com.saborcearense.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/impressao")
public class ImpressaoController {
    private final PedidoRepository pedidos;
    private final boolean habilitada;

    public ImpressaoController(PedidoRepository pedidos,
            @Value("${app.impressao-automatica.enabled:false}") boolean habilitada) {
        this.pedidos = pedidos;
        this.habilitada = habilitada;
    }

    @GetMapping("/configuracao")
    public java.util.Map<String, Boolean> configuracao() {
        return java.util.Map.of("habilitada", habilitada);
    }

    @GetMapping("/instalador")
    public ResponseEntity<ByteArrayResource> instalador() throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            for (String nome : List.of("agente.ps1", "instalar.cmd", "leia-me.txt")) {
                zip.putNextEntry(new ZipEntry(nome));
                try (var entrada = new ClassPathResource("impressao/" + nome).getInputStream()) {
                    entrada.transferTo(zip);
                }
                zip.closeEntry();
            }
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sabor-cearense-impressao.zip\"")
                .body(new ByteArrayResource(bytes.toByteArray()));
    }

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
