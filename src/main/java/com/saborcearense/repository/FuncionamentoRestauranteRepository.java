package com.saborcearense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import com.saborcearense.model.FuncionamentoRestaurante;

public interface FuncionamentoRestauranteRepository extends JpaRepository<FuncionamentoRestaurante, Long> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update FuncionamentoRestaurante f set f.manualAte = :ate where f.id = 1 and f.manualAte is null")
    int definirPrazoLegado(@Param("ate") Instant ate);
}
