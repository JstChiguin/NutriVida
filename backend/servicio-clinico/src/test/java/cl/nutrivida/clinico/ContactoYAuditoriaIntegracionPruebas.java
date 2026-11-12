package cl.nutrivida.clinico;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ContactoYAuditoriaIntegracionPruebas extends BaseIntegracionClinica {

    private final Map<String, Object> solicitud = Map.of("nombre", "Visitante Ficticio", "correo", "visita@nutrivida.test",
            "telefono", "56912345678", "mensaje", "Quisiera información sobre planes deportivos");

    @Test
    void registraSolicitudesPublicasYEvitaDuplicadosAlReenviar() throws Exception {
        String primeraId = leer(ejecutar(post("/api/solicitudes-contacto"), null, solicitud)
                .andExpect(status().isCreated())).get("id").asText();
        String segundaId = leer(ejecutar(post("/api/solicitudes-contacto"), null, solicitud)
                .andExpect(status().isOk())).get("id").asText();

        assertThat(segundaId).isEqualTo(primeraId);
        assertThat(plantillaMongo.getCollection("solicitudes_contacto").countDocuments()).isEqualTo(1);
    }

    @Test
    void validaLosDatosDelFormularioDeContacto() throws Exception {
        ejecutar(post("/api/solicitudes-contacto"), null, Map.of("nombre", "Ab", "correo", "no-es-correo", "mensaje", "corto"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detalles").isNotEmpty());
    }

    @Test
    void soloElAdministradorGestionaLasSolicitudes() throws Exception {
        String id = leer(ejecutar(post("/api/solicitudes-contacto"), null, solicitud)).get("id").asText();

        ejecutar(get("/api/solicitudes-contacto"), null, null).andExpect(status().isUnauthorized());
        ejecutar(get("/api/solicitudes-contacto"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(get("/api/solicitudes-contacto?estado=PENDIENTE"), administrador, null)
                .andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(patch("/api/solicitudes-contacto/" + id + "/estado"), administrador, Map.of("estado", "RESUELTA"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RESUELTA"));
    }

    @Test
    void resumeLosPacientesSoloParaElAdministrador() throws Exception {
        ejecutar(get("/api/reportes/pacientes"), administrador, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRegistrados").value(2))
                .andExpect(jsonPath("$.activos").value(2))
                .andExpect(jsonPath("$.registradosPorMes.length()").value(1));
        ejecutar(get("/api/reportes/pacientes"), nutricionistaAna, null).andExpect(status().isForbidden());
    }

    @Test
    void registraYPermiteConsultarLaAuditoriaDeOperacionesImportantes() throws Exception {
        ejecutar(patch("/api/pacientes/" + pacientePedro.perfilId() + "/estado"), administrador, Map.of("activo", false))
                .andExpect(status().isOk());

        ejecutar(get("/api/auditorias?entidad=pacientes&operacion=DESACTIVAR_PACIENTE"), administrador, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].usuarioId").value(administrador.usuarioId()));
        ejecutar(get("/api/auditorias"), nutricionistaAna, null).andExpect(status().isForbidden());
    }
}
