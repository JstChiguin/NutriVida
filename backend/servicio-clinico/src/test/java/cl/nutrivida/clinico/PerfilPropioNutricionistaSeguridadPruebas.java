package cl.nutrivida.clinico;

import cl.nutrivida.comun.seguridad.Rol;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PerfilPropioNutricionistaSeguridadPruebas extends BaseIntegracionClinica {

    private static final String RUTA = "/api/v1/nutricionistas/yo";

    @Test
    @DisplayName("sin token responde 401 NO_AUTENTICADO")
    void sinTokenResponde401() throws Exception {
        ejecutar(get(RUTA), null, null).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
    }

    @Test
    @DisplayName("token inválido responde 401")
    void tokenInvalidoResponde401() throws Exception {
        mockMvc.perform(get(RUTA).header("Authorization", "Bearer abc.def.ghi"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.codigo").value("NO_AUTENTICADO"));
    }

    @Test
    @DisplayName("token expirado responde 401")
    void tokenExpiradoResponde401() throws Exception {
        String expirado = servicioTokens.generar(nutricionistaAna.usuarioId(), "ana@nutrivida.test",
                Rol.NUTRICIONISTA, Duration.ofSeconds(-5));
        mockMvc.perform(get(RUTA).header("Authorization", "Bearer " + expirado))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token válido de paciente o administrador responde 403 PERMISO_DENEGADO")
    void rolInsuficienteResponde403() throws Exception {
        ejecutar(get(RUTA), pacientePedro, null).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("PERMISO_DENEGADO"));
        ejecutar(get(RUTA), administrador, null).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("PERMISO_DENEGADO"));
    }

    @Test
    @DisplayName("token válido de nutricionista responde 200 con su perfil")
    void nutricionistaResponde200() throws Exception {
        ejecutar(get(RUTA), nutricionistaAna, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto").value("Ana Ficticia"));
    }

    @Test
    @DisplayName("las rutas públicas y las demás rutas protegidas conservan su comportamiento")
    void otrasRutasConservanSuComportamiento() throws Exception {
        ejecutar(get("/api/v1/nutricionistas"), null, null).andExpect(status().isOk());
        ejecutar(get("/api/v1/nutricionistas/" + nutricionistaAna.perfilId()), null, null).andExpect(status().isOk());
        ejecutar(get("/api/v1/servicios"), null, null).andExpect(status().isOk());
        ejecutar(get("/api/v1/pacientes/yo"), null, null).andExpect(status().isUnauthorized());
        ejecutar(get("/api/v1/pacientes/yo"), nutricionistaAna, null).andExpect(status().isForbidden());
        assertThat(nutricionistaAna.token()).isNotBlank();
    }
}
