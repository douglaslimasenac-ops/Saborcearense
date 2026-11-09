package com.saborcearense.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import com.saborcearense.model.DispositivoImpressao;
import com.saborcearense.repository.DispositivoImpressaoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DispositivoImpressaoService {
    private final DispositivoImpressaoRepository dispositivos;
    private final SecureRandom aleatorio = new SecureRandom();

    public DispositivoImpressaoService(DispositivoImpressaoRepository dispositivos) {
        this.dispositivos = dispositivos;
    }

    private String gerarSegredo() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String valor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 não está disponível", erro);
        }
    }

    private boolean formatoValido(String valor) {
        return valor != null && valor.matches("[A-Za-z0-9_-]{43}");
    }

    @Transactional
    public String gerarCodigo() {
        Instant agora = Instant.now();
        String codigo = gerarSegredo();
        DispositivoImpressao dispositivo = dispositivos.buscarParaAtualizar(1L).orElseGet(DispositivoImpressao::new);
        dispositivo.setCodigoHash(hash(codigo));
        dispositivo.setExpiraEm(agora.plusSeconds(900));
        dispositivos.save(dispositivo);
        return codigo;
    }

    @Transactional
    public String vincular(String codigo) {
        if (!formatoValido(codigo)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código de instalação inválido");
        DispositivoImpressao dispositivo = dispositivos.buscarParaAtualizar(1L)
                .filter(d -> hash(codigo).equals(d.getCodigoHash()) && d.getExpiraEm() != null
                        && d.getExpiraEm().isAfter(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Código expirado ou já utilizado; baixe outro instalador"));
        String credencial = gerarSegredo();
        dispositivo.setCodigoHash(null);
        dispositivo.setExpiraEm(null);
        dispositivo.setCredencialHash(hash(credencial));
        return credencial;
    }

    @Transactional(readOnly = true)
    public boolean credencialValida(String credencial) {
        return formatoValido(credencial) && dispositivos.existsByCredencialHash(hash(credencial));
    }

    @Transactional
    public void revogarTodos() {
        dispositivos.buscarParaAtualizar(1L).ifPresent(dispositivo -> {
            dispositivo.setCodigoHash(null);
            dispositivo.setExpiraEm(null);
            dispositivo.setCredencialHash(null);
        });
    }
}
