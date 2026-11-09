package com.saborcearense.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.admin.password=teste-local")
@AutoConfigureMockMvc
class PwaAdminTest {
    @Autowired private MockMvc mvc;

    @Test
    void recursosDoAplicativoSaoServidosPeloSpring() throws Exception {
        mvc.perform(get("/admin-manifest.json"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"));
        mvc.perform(get("/admin-sw.js")).andExpect(status().isOk());
        mvc.perform(get("/admin-offline.html")).andExpect(status().isOk());
        mvc.perform(get("/imagens/app/admin-192.png"))
                .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("image/png"));
        mvc.perform(get("/imagens/app/admin-512.png"))
                .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("image/png"));
        mvc.perform(get("/imagens/app/admin-maskable-512.png"))
                .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("image/png"));
    }
}
