package cl.nutrivida.clinico;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class VersionadoApiIntegracionPruebas extends BaseIntegracionClinica {

    private Map<String, Object> cuerpoServicio(String nombre, int duracion) {
        return Map.of("nombre", nombre, "descripcion", "Descripción ficticia", "categoria", "Control",
                "duracionMinutos", duracion, "precioReferencial", 30000);
    }

    @Test
    void elCatalogoPublicoRespondeEnLaRutaVersionadaSinMarcarlaComoObsoleta() throws Exception {
        ejecutar(get("/api/v1/servicios"), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(header().doesNotExist("Deprecation"));
        ejecutar(get("/api/v1/nutricionistas"), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(2));
        ejecutar(get("/api/v1/nutricionistas/" + nutricionistaAna.perfilId()), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto").value("Ana Ficticia"));
    }

    @Test
    void laRutaAntiguaEntregaLaMismaRespuestaYAvisaDeLaVersionSucesora() throws Exception {
        MvcResult versionada = ejecutar(get("/api/v1/servicios?soloActivos=false"), null, null)
                .andExpect(status().isOk()).andReturn();
        MvcResult antigua = ejecutar(get("/api/servicios?soloActivos=false"), null, null)
                .andExpect(status().isOk())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Link", "</api/v1/servicios?soloActivos=false>; rel=\"successor-version\""))
                .andReturn();

        assertThat(antigua.getResponse().getContentAsString()).isEqualTo(versionada.getResponse().getContentAsString());
    }

    @Test
    void soloElAdministradorCreaServiciosEnLaRutaVersionada() throws Exception {
        ejecutar(post("/api/v1/servicios"), null, cuerpoServicio("Sin sesión", 30)).andExpect(status().isUnauthorized());
        ejecutar(post("/api/v1/servicios"), pacientePedro, cuerpoServicio("Paciente", 30)).andExpect(status().isForbidden());
        ejecutar(post("/api/v1/servicios"), nutricionistaAna, cuerpoServicio("Nutri", 30)).andExpect(status().isForbidden());
        ejecutar(post("/api/v1/servicios"), administrador, cuerpoServicio("Evaluación deportiva", 45))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.activo").value(true));
    }

    @Test
    void recorreElCrudCompletoDeServiciosEnLaRutaVersionada() throws Exception {
        String id = leer(ejecutar(post("/api/v1/servicios"), administrador, cuerpoServicio("Plan vegetariano", 45))
                .andExpect(status().isCreated())).get("id").asText();

        ejecutar(get("/api/v1/servicios/" + id), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Plan vegetariano"));
        ejecutar(put("/api/v1/servicios/" + id), administrador, cuerpoServicio("Plan vegetariano avanzado", 60))
                .andExpect(status().isOk()).andExpect(jsonPath("$.duracionMinutos").value(60));
        ejecutar(patch("/api/v1/servicios/" + id + "/estado"), administrador, Map.of("activo", false))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activo").value(false));
        ejecutar(delete("/api/v1/servicios/" + id), administrador, null).andExpect(status().isNoContent());
        ejecutar(get("/api/v1/servicios?soloActivos=false"), null, null)
                .andExpect(jsonPath("$.totalElementos").value(2));
    }

    @Test
    void laEscrituraEnLaRutaAntiguaSigueExigiendoAutenticacionYRol() throws Exception {
        ejecutar(post("/api/servicios"), null, cuerpoServicio("Sin sesión", 30)).andExpect(status().isUnauthorized());
        ejecutar(post("/api/servicios"), pacientePedro, cuerpoServicio("Paciente", 30)).andExpect(status().isForbidden());
        ejecutar(post("/api/servicios"), administrador, cuerpoServicio("Antigua válida", 30))
                .andExpect(status().isCreated())
                .andExpect(header().string("Deprecation", "true"));
    }

    @Test
    void losRecursosProtegidosExigenTokenEnAmbasRutas() throws Exception {
        ejecutar(get("/api/v1/pacientes"), null, null).andExpect(status().isUnauthorized());
        ejecutar(get("/api/pacientes"), null, null).andExpect(status().isUnauthorized());
        ejecutar(get("/api/v1/pacientes"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(get("/api/v1/pacientes/yo"), pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto").value("Pedro Ficticio"));
    }

    @Test
    void lasRutasInexistentesDevuelvenNoEncontrado() throws Exception {
        ejecutar(get("/api/v1/inexistente"), administrador, null).andExpect(status().isNotFound());
        ejecutar(get("/api/inexistente"), administrador, null).andExpect(status().isNotFound());
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
