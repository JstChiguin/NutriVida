package cl.nutrivida.agenda;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class VersionadoApiIntegracionPruebas extends BaseIntegracionAgenda {

    @Test
    void listaLasCitasEnLaRutaVersionadaSinMarcarlaComoObsoleta() throws Exception {
        ejecutar(get("/api/v1/citas"), pacientePedro, null).andExpect(status().isOk())
                .andExpect(header().doesNotExist("Deprecation"));
    }

    @Test
    void laRutaAntiguaEntregaLaMismaRespuestaYAvisaDeLaVersionSucesora() throws Exception {
        MvcResult versionada = ejecutar(get("/api/v1/citas"), pacientePedro, null)
                .andExpect(status().isOk()).andReturn();
        MvcResult antigua = ejecutar(get("/api/citas"), pacientePedro, null)
                .andExpect(status().isOk())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Link", "</api/v1/citas>; rel=\"successor-version\""))
                .andReturn();

        assertThat(antigua.getResponse().getContentAsString()).isEqualTo(versionada.getResponse().getContentAsString());
    }

    @Test
    void exigeTokenEnAmbasRutas() throws Exception {
        ejecutar(get("/api/v1/citas"), null, null).andExpect(status().isUnauthorized());
        ejecutar(get("/api/citas"), null, null).andExpect(status().isUnauthorized());
    }

    @Test
    void losReportesSonExclusivosDelAdministradorEnAmbasRutas() throws Exception {
        ejecutar(get("/api/v1/reportes/citas-por-estado"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(get("/api/v1/reportes/citas-por-estado"), nutricionistaAna, null).andExpect(status().isForbidden());
        ejecutar(get("/api/v1/reportes/citas-por-estado"), administrador, null).andExpect(status().isOk());
        ejecutar(get("/api/reportes/citas-por-estado"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(get("/api/reportes/citas-por-estado"), administrador, null).andExpect(status().isOk());
    }

    @Test
    void elTokenRevocadoSigueSiendoRechazadoEnLaRutaVersionada() throws Exception {
        String identificador = servicioTokens.validar(pacientePedro.token()).orElseThrow().identificadorToken();
        plantillaMongo.save(new java.util.HashMap<>(java.util.Map.of("_id", identificador, "usuarioId", "x",
                "revocadoEn", java.time.Instant.now(), "expiraEn", java.time.Instant.now().plus(java.time.Duration.ofHours(1)))),
                "tokens_revocados");

        ejecutar(get("/api/v1/citas"), pacientePedro, null).andExpect(status().isUnauthorized());
    }

    @Test
    void swaggerDocumentaSoloLasRutasVersionadas() throws Exception {
        String documento = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        var rutas = convertidorJson.readTree(documento).get("paths");

        assertThat(rutas.size()).isPositive();
        rutas.fieldNames().forEachRemaining(ruta -> assertThat(ruta).startsWith("/api/v1/"));
    }
}
