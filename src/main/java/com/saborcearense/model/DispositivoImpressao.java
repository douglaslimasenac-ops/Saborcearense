package com.saborcearense.model;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dispositivos_impressao")
public class DispositivoImpressao {
    @Id
    private Long id = 1L;

    @Column(unique = true, length = 64)
    private String codigoHash;

    @Column(unique = true, length = 64)
    private String credencialHash;

    private Instant expiraEm;

    public Long getId() { return id; }
    public String getCodigoHash() { return codigoHash; }
    public void setCodigoHash(String codigoHash) { this.codigoHash = codigoHash; }
    public String getCredencialHash() { return credencialHash; }
    public void setCredencialHash(String credencialHash) { this.credencialHash = credencialHash; }
    public Instant getExpiraEm() { return expiraEm; }
    public void setExpiraEm(Instant expiraEm) { this.expiraEm = expiraEm; }
}
