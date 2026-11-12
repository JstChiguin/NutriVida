package cl.nutrivida.agenda;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PagosYReportesIntegracionPruebas extends BaseIntegracionAgenda {

    @BeforeEach
    void definirAgendas() throws Exception {
        definirJornadaLaboral(nutricionistaAna);
        definirJornadaLaboral(nutricionistaBruno);
    }

    private String solicitar(Persona paciente, Persona nutricionista, String servicioId, Instant inicio) throws Exception {
        return leer(ejecutar(post("/api/citas"), paciente, solicitudCita(nutricionista, servicioId, inicio))
                .andExpect(status().isCreated())).get("id").asText();
    }

    @Test
    void apruebaUnPagoSimuladoYEmiteUnComprobanteFicticio() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));

        JsonNode pago = leer(ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro,
                Map.of("metodo", "TARJETA_SIMULADA")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.simulado").value(true))
                .andExpect(jsonPath("$.estado").value("APROBADO_SIMULADO")));

        assertThat(pago.get("comprobante").get("numero").asText()).startsWith("NV-20261102-");
        assertThat(pago.get("comprobante").get("glosa").asText()).contains("FICTICIO");
        assertThat(pago.get("monto").asInt()).isEqualTo(25000);
        ejecutar(get("/api/citas/" + citaId), pacientePedro, null).andExpect(jsonPath("$.pagada").value(true));
        ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro, Map.of("metodo", "TARJETA_SIMULADA"))
                .andExpect(status().isConflict());
    }

    @Test
    void unPagoRechazadoNoTieneComprobanteNiMarcaLaCitaComoPagada() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));

        ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro,
                Map.of("metodo", "TRANSFERENCIA_SIMULADA", "simularRechazo", true)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("RECHAZADO_SIMULADO")).andExpect(jsonPath("$.comprobante").doesNotExist());
        ejecutar(get("/api/citas/" + citaId), pacientePedro, null).andExpect(jsonPath("$.pagada").value(false));
        ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro, Map.of("metodo", "TARJETA_SIMULADA"))
                .andExpect(status().isCreated());
    }

    @Test
    void protegeLosPagosDeOtrosUsuariosYRolesNoAutorizados() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
        String pagoId = leer(ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro,
                Map.of("metodo", "EFECTIVO_SIMULADO")).andExpect(status().isCreated())).get("id").asText();

        ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePaula, Map.of("metodo", "TARJETA_SIMULADA"))
                .andExpect(status().isForbidden());
        ejecutar(post("/api/citas/" + citaId + "/pagos"), nutricionistaAna, Map.of("metodo", "TARJETA_SIMULADA"))
                .andExpect(status().isForbidden());
        ejecutar(get("/api/pagos/" + pagoId), pacientePaula, null).andExpect(status().isForbidden());
        ejecutar(get("/api/pagos/" + pagoId), pacientePedro, null).andExpect(status().isOk());
        ejecutar(get("/api/pagos"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(get("/api/pagos?estado=APROBADO_SIMULADO"), administrador, null).andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/citas/" + citaId + "/pagos"), pacientePedro, null).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void elAdministradorAnulaPagosYLaCitaDejaDeEstarPagada() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
        String pagoId = leer(ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro,
                Map.of("metodo", "TARJETA_SIMULADA")).andExpect(status().isCreated())).get("id").asText();

        ejecutar(patch("/api/pagos/" + pagoId + "/anulacion"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(patch("/api/pagos/" + pagoId + "/anulacion"), administrador, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ANULADO"));
        ejecutar(patch("/api/pagos/" + pagoId + "/anulacion"), administrador, null).andExpect(status().isConflict());
        ejecutar(get("/api/citas/" + citaId), pacientePedro, null).andExpect(jsonPath("$.pagada").value(false));
    }

    @Test
    void noPermitePagarCitasCanceladas() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
        ejecutar(patch("/api/citas/" + citaId + "/cancelacion"), pacientePedro, Map.of("motivo", "Viaje")).andExpect(status().isOk());

        ejecutar(post("/api/citas/" + citaId + "/pagos"), pacientePedro, Map.of("metodo", "TARJETA_SIMULADA"))
                .andExpect(status().isConflict());
    }

    private void prepararActividad() throws Exception {
        String realizada = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
        solicitar(pacientePaula, nutricionistaAna, servicioControlId, a(MARTES, 10, 0));
        String cancelada = solicitar(pacientePedro, nutricionistaBruno, servicioDeportivoId, a(MIERCOLES, 9, 0));
        solicitar(pacientePaula, nutricionistaBruno, servicioControlId, a(MIERCOLES, 11, 0));
        ejecutar(patch("/api/citas/" + cancelada + "/cancelacion"), pacientePedro, Map.of("motivo", "Viaje")).andExpect(status().isOk());
        ejecutar(patch("/api/citas/" + realizada + "/reprogramacion"), nutricionistaAna,
                Map.of("nuevoInicio", a(MARTES, 12, 0).toString(), "motivo", "Ajuste")).andExpect(status().isOk());
    }

    @Test
    void reportaCitasPorEstadoYEventosDelHistorialConAgregaciones() throws Exception {
        prepararActividad();

        ejecutar(get("/api/reportes/citas-por-estado"), administrador, null).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.estado=='SOLICITADA')].cantidad").value(3))
                .andExpect(jsonPath("$[?(@.estado=='CANCELADA')].cantidad").value(1));
        ejecutar(get("/api/reportes/eventos-de-citas"), administrador, null)
                .andExpect(jsonPath("$[?(@.evento=='SOLICITUD')].cantidad").value(4))
                .andExpect(jsonPath("$[?(@.evento=='REPROGRAMACION')].cantidad").value(1))
                .andExpect(jsonPath("$[?(@.evento=='CANCELACION')].cantidad").value(1));
    }

    @Test
    void reportaServiciosMasSolicitadosYAtencionesPorProfesional() throws Exception {
        prepararActividad();

        ejecutar(get("/api/reportes/servicios-mas-solicitados"), administrador, null)
                .andExpect(jsonPath("$[0].nombreServicio").value("Control nutricional"))
                .andExpect(jsonPath("$[0].solicitudes").value(3))
                .andExpect(jsonPath("$[1].nombreServicio").value("Nutrición deportiva"));
        ejecutar(get("/api/reportes/atenciones-por-nutricionista"), administrador, null)
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.nombreNutricionista=='Bruno Ficticio')].canceladas").value(1));
    }

    @Test
    void reportaLaActividadDeLaAgendaPorDiaYPorProfesional() throws Exception {
        prepararActividad();

        ejecutar(get("/api/reportes/actividad-agenda"), administrador, null)
                .andExpect(jsonPath("$[?(@.fecha=='2026-11-03')].citas").value(2))
                .andExpect(jsonPath("$[?(@.fecha=='2026-11-04')].citas").value(2));
        ejecutar(get("/api/reportes/actividad-agenda?nutricionistaId=" + nutricionistaBruno.perfilId()), administrador, null)
                .andExpect(jsonPath("$.length()").value(1));
        ejecutar(get("/api/reportes/citas-por-estado?desde=" + a(MIERCOLES, 0, 0) + "&hasta=" + a(MIERCOLES.plusDays(1), 0, 0)),
                administrador, null).andExpect(jsonPath("$[?(@.estado=='SOLICITADA')].cantidad").value(1));
    }

    @Test
    void cuentaPacientesAtendidosSoloConAtencionesRealizadas() throws Exception {
        ejecutar(get("/api/reportes/pacientes-atendidos"), administrador, null)
                .andExpect(jsonPath("$.pacientes").value(0)).andExpect(jsonPath("$.atenciones").value(0));
    }

    @Test
    void losReportesSonExclusivosDelAdministrador() throws Exception {
        for (String ruta : new String[]{"citas-por-estado", "atenciones-por-nutricionista", "servicios-mas-solicitados",
                "actividad-agenda", "eventos-de-citas", "pacientes-atendidos"}) {
            ejecutar(get("/api/reportes/" + ruta), nutricionistaAna, null).andExpect(status().isForbidden());
            ejecutar(get("/api/reportes/" + ruta), pacientePedro, null).andExpect(status().isForbidden());
            ejecutar(get("/api/reportes/" + ruta), null, null).andExpect(status().isUnauthorized());
        }
    }
}
