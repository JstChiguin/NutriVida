package cl.nutrivida.agenda;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecordatoriosIntegracionPruebas extends BaseIntegracionAgenda {

    @BeforeEach
    void definirAgenda() throws Exception {
        definirJornadaLaboral(nutricionistaAna);
    }

    private String solicitarYConfirmar(Persona paciente, Instant inicio) throws Exception {
        String citaId = leer(ejecutar(post("/api/citas"), paciente, solicitudCita(nutricionistaAna, servicioControlId, inicio))
                .andExpect(status().isCreated())).get("id").asText();
        ejecutar(patch("/api/citas/" + citaId + "/confirmacion"), nutricionistaAna, null).andExpect(status().isOk());
        return citaId;
    }

    @Test
    void unaCitaConfirmadaDentroDeLaVentanaGeneraUnRecordatorioUnico() throws Exception {
        String citaId = solicitarYConfirmar(pacientePedro, a(MARTES, 9, 0));

        ejecutar(get("/api/citas/recordatorios"), pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].citaId").value(citaId))
                .andExpect(jsonPath("$[0].minutosRestantes").value(1440));
    }

    @Test
    void unaCitaSoloSolicitadaOFueraDeLaVentanaNoGeneraRecordatorio() throws Exception {
        leer(ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 10, 0)))
                .andExpect(status().isCreated()));
        solicitarYConfirmar(pacientePaula, a(MIERCOLES, 10, 0));

        ejecutar(get("/api/citas/recordatorios"), pacientePedro, null).andExpect(jsonPath("$.length()").value(0));
        ejecutar(get("/api/citas/recordatorios"), pacientePaula, null).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void cancelarOReprogramarActualizaElRecordatorioSinDuplicados() throws Exception {
        String citaId = solicitarYConfirmar(pacientePedro, a(MARTES, 9, 0));

        ejecutar(patch("/api/citas/" + citaId + "/reprogramacion"), pacientePedro,
                Map.of("nuevoInicio", a(MIERCOLES, 10, 0).toString(), "motivo", "Cambio de horario"));
        ejecutar(get("/api/citas/recordatorios"), pacientePedro, null).andExpect(jsonPath("$.length()").value(0));

        String otraCita = solicitarYConfirmar(pacientePedro, a(MARTES, 9, 0));
        ejecutar(get("/api/citas/recordatorios"), pacientePedro, null).andExpect(jsonPath("$.length()").value(1));
        ejecutar(patch("/api/citas/" + otraCita + "/cancelacion"), pacientePedro, Map.of("motivo", "Imprevisto"))
                .andExpect(status().isOk());
        ejecutar(get("/api/citas/recordatorios"), pacientePedro, null).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void cadaPacienteSoloVeSusPropiosRecordatoriosYLosDemasRolesNoAccedenAlEndpoint() throws Exception {
        solicitarYConfirmar(pacientePedro, a(MARTES, 9, 0));

        ejecutar(get("/api/citas/recordatorios"), pacientePaula, null).andExpect(jsonPath("$.length()").value(0));
        ejecutar(get("/api/citas/recordatorios"), nutricionistaAna, null).andExpect(status().isForbidden());
        ejecutar(get("/api/citas/recordatorios"), administrador, null).andExpect(status().isForbidden());
        ejecutar(get("/api/citas/recordatorios"), null, null).andExpect(status().isUnauthorized());
    }
}
