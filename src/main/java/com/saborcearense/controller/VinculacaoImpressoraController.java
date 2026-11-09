package com.saborcearense.controller;

import java.util.Map;
import com.saborcearense.security.DispositivoImpressaoService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/impressao")
public class VinculacaoImpressoraController {
    private final DispositivoImpressaoService dispositivos;

    public VinculacaoImpressoraController(DispositivoImpressaoService dispositivos) {
        this.dispositivos = dispositivos;
    }

    @PostMapping("/vincular")
    public ResponseEntity<Map<String, String>> vincular(@RequestBody CodigoVinculacao pedido) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("credencial", dispositivos.vincular(pedido.codigo())));
    }

    public record CodigoVinculacao(String codigo) {}
}
