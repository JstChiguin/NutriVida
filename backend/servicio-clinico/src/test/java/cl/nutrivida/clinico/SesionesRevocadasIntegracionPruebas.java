package cl.nutrivida.clinico;

import cl.nutrivida.comun.seguridad.Rol;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SesionesRevocadasIntegracionPruebas extends BaseIntegracionClinica {

    private String rutaPerfil(Persona paciente) {
        return "/api/pacientes/" + paciente.perfilId();
    }

    private void revocar(String token) {
        String identificador = servicioTokens.validar(token).orElseThrow().identificadorToken();
        plantillaMongo.save(new java.util.HashMap<>(Map.of("_id", identificador, "usuarioId", "x", "revocadoEn", Instant.now(),
                "expiraEn", Instant.now().plus(Duration.ofHours(1)))), "tokens_revocados");
    }

    @Test
    void unTokenVigenteAccedeAlRecursoPropio() throws Exception {
        ejecutar(get(rutaPerfil(pacientePedro)), pacientePedro, null).andExpect(status().isOk());
    }

    @Test
    void unTokenRevocadoEnElServicioDeAutenticacionEsRechazadoEnElServicioClinico() throws Exception {
        revocar(pacientePedro.token());

        ejecutar(get(rutaPerfil(pacientePedro)), pacientePedro, null).andExpect(status().isUnauthorized());
    }

    @Test
    void revocarUnTokenNoAfectaLosTokensDeOtrasPersonas() throws Exception {
        revocar(pacientePedro.token());

        ejecutar(get(rutaPerfil(pacientePaula)), pacientePaula, null).andExpect(status().isOk());
    }

    @Test
    void unTokenExpiradoEsRechazado() throws Exception {
        String expirado = servicioTokens.generar(pacientePedro.usuarioId(), "pedro@nutrivida.test", Rol.PACIENTE,
                Duration.ofSeconds(-10));

        ejecutar(get(rutaPerfil(pacientePedro)), new Persona(pacientePedro.usuarioId(), pacientePedro.perfilId(), expirado),
                null).andExpect(status().isUnauthorized());
    }

    @Test
    void unPacienteNoPuedeLeerLaFichaDeOtroPacienteAunConTokenValido() throws Exception {
        ejecutar(get(rutaPerfil(pacientePedro) + "/ficha-clinica"), pacientePaula, null)
                .andExpect(status().isForbidden());
    }

    @Test
    void sinTokenSeResponde401() throws Exception {
        ejecutar(get(rutaPerfil(pacientePedro)), null, null).andExpect(status().isUnauthorized());
    }
}
