package com.saborcearense.repository;

import java.util.Optional;
import com.saborcearense.model.DispositivoImpressao;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DispositivoImpressaoRepository extends JpaRepository<DispositivoImpressao, Long> {
    boolean existsByCredencialHash(String credencialHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DispositivoImpressao d where d.id = :id")
    Optional<DispositivoImpressao> buscarParaAtualizar(@Param("id") Long id);
}
