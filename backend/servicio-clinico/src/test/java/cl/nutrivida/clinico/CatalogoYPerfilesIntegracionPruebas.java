package cl.nutrivida.clinico;

import cl.nutrivida.comun.seguridad.Rol;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CatalogoYPerfilesIntegracionPruebas extends BaseIntegracionClinica {

    private Map<String, Object> cuerpoServicio(String nombre, int duracion) {
        return Map.of("nombre", nombre, "descripcion", "Descripción ficticia", "categoria", "Control",
                "duracionMinutos", duracion, "precioReferencial", 30000);
    }

    @Test
    void cualquierVisitanteConsultaElCatalogoDeServiciosYNutricionistas() throws Exception {
        ejecutar(get("/api/servicios"), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/nutricionistas"), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(2));
        ejecutar(get("/api/nutricionistas/" + nutricionistaAna.perfilId()), null, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto").value("Ana Ficticia"));
    }

    @Test
    void soloElAdministradorCreaServicios() throws Exception {
        ejecutar(post("/api/servicios"), null, cuerpoServicio("Sin sesión", 30)).andExpect(status().isUnauthorized());
        ejecutar(post("/api/servicios"), pacientePedro, cuerpoServicio("Paciente", 30)).andExpect(status().isForbidden());
        ejecutar(post("/api/servicios"), nutricionistaAna, cuerpoServicio("Nutri", 30)).andExpect(status().isForbidden());
        ejecutar(post("/api/servicios"), administrador, cuerpoServicio("Evaluación deportiva", 45))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.activo").value(true));
    }

    @Test
    void validaDuracionYNombreUnicoDeServicios() throws Exception {
        ejecutar(post("/api/servicios"), administrador, cuerpoServicio("Duración rara", 20))
                .andExpect(status().isBadRequest());
        ejecutar(post("/api/servicios"), administrador, cuerpoServicio("control nutricional", 30))
                .andExpect(status().isConflict());
    }

    @Test
    void desactivarUnServicioLoDejaFueraDelCatalogoPublicoSinEliminarlo() throws Exception {
        ejecutar(delete("/api/servicios/" + servicioControl.id()), administrador, null).andExpect(status().isNoContent());

        ejecutar(get("/api/servicios"), null, null).andExpect(jsonPath("$.totalElementos").value(0));
        ejecutar(get("/api/servicios?soloActivos=false"), null, null).andExpect(jsonPath("$.totalElementos").value(1));
    }

    @Test
    void filtraServiciosPorCategoriaYTexto() throws Exception {
        ejecutar(post("/api/servicios"), administrador, cuerpoServicio("Plan deportivo", 60)).andExpect(status().isCreated());

        ejecutar(get("/api/servicios?categoria=Control&texto=deportivo"), null, null)
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].nombre").value("Plan deportivo"));
    }

    @Test
    void administradorGestionaNutricionistas() throws Exception {
        Map<String, Object> cuerpo = Map.of("usuarioId", new org.bson.types.ObjectId().toHexString(),
                "nombreCompleto", "Carla Ficticia", "titulo", "Nutricionista", "especialidades", List.of("Deportiva"),
                "serviciosIds", List.of(servicioControl.id()));
        String id = leer(ejecutar(post("/api/nutricionistas"), administrador, cuerpo).andExpect(status().isCreated()))
                .get("id").asText();

        ejecutar(get("/api/nutricionistas?especialidad=Deportiva"), null, null)
                .andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(delete("/api/nutricionistas/" + id), administrador, null).andExpect(status().isNoContent());
        ejecutar(get("/api/nutricionistas"), null, null).andExpect(jsonPath("$.totalElementos").value(2));
        ejecutar(post("/api/nutricionistas"), pacientePedro, cuerpo).andExpect(status().isForbidden());
    }

    @Test
    void rechazaNutricionistaConServicioInexistente() throws Exception {
        Map<String, Object> cuerpo = Map.of("usuarioId", new org.bson.types.ObjectId().toHexString(),
                "nombreCompleto", "Carla Ficticia", "especialidades", List.of("Deportiva"),
                "serviciosIds", List.of(new org.bson.types.ObjectId().toHexString()));

        ejecutar(post("/api/nutricionistas"), administrador, cuerpo).andExpect(status().isBadRequest());
    }

    @Test
    void elPacienteSoloVeYEditaSuPropioPerfil() throws Exception {
        ejecutar(get("/api/pacientes/yo"), pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto").value("Pedro Ficticio"));
        ejecutar(get("/api/pacientes/" + pacientePaula.perfilId()), pacientePedro, null)
                .andExpect(status().isForbidden());
        ejecutar(put("/api/pacientes/yo"), pacientePedro, Map.of("nombreCompleto", "Pedro Actualizado",
                "telefono", "56999998888", "sexo", "MASCULINO")).andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto").value("Pedro Actualizado"));
    }

    @Test
    void elPacienteNoPuedeListarNiAdministrarPacientes() throws Exception {
        ejecutar(get("/api/pacientes"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(patch("/api/pacientes/" + pacientePaula.perfilId() + "/estado"), pacientePedro, Map.of("activo", false))
                .andExpect(status().isForbidden());
    }

    @Test
    void elNutricionistaSoloListaALosPacientesAutorizados() throws Exception {
        autorizar(nutricionistaAna, pacientePedro);

        ejecutar(get("/api/pacientes"), nutricionistaAna, null).andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].nombreCompleto").value("Pedro Ficticio"));
        ejecutar(get("/api/pacientes"), nutricionistaBruno, null).andExpect(jsonPath("$.totalElementos").value(0));
        ejecutar(get("/api/pacientes/" + pacientePedro.perfilId()), nutricionistaBruno, null)
                .andExpect(status().isForbidden());
        ejecutar(get("/api/pacientes"), administrador, null).andExpect(jsonPath("$.totalElementos").value(2));
    }

    @Test
    void administradorAutorizaYRetiraNutricionistasYDesactivaPacientes() throws Exception {
        ejecutar(put("/api/pacientes/" + pacientePedro.perfilId() + "/nutricionistas/" + nutricionistaAna.perfilId()),
                administrador, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nutricionistasAutorizados[0]").value(nutricionistaAna.perfilId()));
        ejecutar(get("/api/pacientes/" + pacientePedro.perfilId()), nutricionistaAna, null).andExpect(status().isOk());
        ejecutar(delete("/api/pacientes/" + pacientePedro.perfilId() + "/nutricionistas/" + nutricionistaAna.perfilId()),
                administrador, null).andExpect(status().isOk());
        ejecutar(get("/api/pacientes/" + pacientePedro.perfilId()), nutricionistaAna, null)
                .andExpect(status().isForbidden());
        ejecutar(delete("/api/pacientes/" + pacientePedro.perfilId()), administrador, null)
                .andExpect(status().isNoContent());
        assertThat(repositorioPacientes.findById(pacientePedro.perfilId()).orElseThrow().activo()).isFalse();
    }

    @Test
    void elEndpointInternoSoloAceptaTokensDeServicio() throws Exception {
        String usuarioId = new org.bson.types.ObjectId().toHexString();
        Map<String, Object> cuerpo = Map.of("usuarioId", usuarioId, "nombreCompleto", "Nueva Ficticia",
                "correo", "nueva@nutrivida.test", "rut", "12345678-5");
        String tokenInterno = servicioTokens.generar("servicio-autenticacion", "interno@nutrivida.local",
                Rol.SERVICIO_INTERNO, Duration.ofMinutes(1));

        mockMvc.perform(post("/api/internos/pacientes").header("Authorization", "Bearer " + administrador.token())
                .contentType("application/json").content(convertidorJson.writeValueAsString(cuerpo)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/internos/pacientes").header("Authorization", "Bearer " + tokenInterno)
                .contentType("application/json").content(convertidorJson.writeValueAsString(cuerpo)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/internos/pacientes").header("Authorization", "Bearer " + tokenInterno)
                .contentType("application/json").content(convertidorJson.writeValueAsString(cuerpo)))
                .andExpect(status().isCreated());
        assertThat(repositorioPacientes.findByUsuarioId(usuarioId)).isPresent();
        assertThat(repositorioPacientes.count()).isEqualTo(3);
    }

    @Test
    void elValidadorDeEsquemaRechazaPacientesInvalidosDirectamenteEnMongo() {
        org.bson.Document invalido = new org.bson.Document("nombreCompleto", "X");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> plantillaMongo.getCollection("pacientes").insertOne(invalido))
                .isInstanceOf(com.mongodb.MongoWriteException.class);
    }
}
