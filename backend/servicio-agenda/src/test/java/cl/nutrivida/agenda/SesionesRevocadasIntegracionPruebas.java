package cl.nutrivida.agenda;

import cl.nutrivida.comun.seguridad.Rol;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SesionesRevocadasIntegracionPruebas extends BaseIntegracionAgenda {

    private void revocar(String token) {
        String identificador = servicioTokens.validar(token).orElseThrow().identificadorToken();
        plantillaMongo.save(new java.util.HashMap<>(Map.of("_id", identificador, "usuarioId", "x", "revocadoEn", Instant.now(),
                "expiraEn", Instant.now().plus(Duration.ofHours(1)))), "tokens_revocados");
    }

    @Test
    void unTokenVigenteListaSusCitas() throws Exception {
        ejecutar(get("/api/citas"), pacientePedro, null).andExpect(status().isOk());
    }

    @Test
    void unTokenRevocadoEsRechazadoEnElServicioDeAgenda() throws Exception {
        revocar(pacientePedro.token());

        ejecutar(get("/api/citas"), pacientePedro, null).andExpect(status().isUnauthorized());
    }

    @Test
    void unTokenExpiradoEsRechazado() throws Exception {
        String expirado = servicioTokens.generar(pacientePedro.usuarioId(), "pedro@nutrivida.test", Rol.PACIENTE,
                Duration.ofSeconds(-10));

        ejecutar(get("/api/citas"), new Persona(pacientePedro.usuarioId(), pacientePedro.perfilId(), expirado), null)
                .andExpect(status().isUnauthorized());
    }
}
