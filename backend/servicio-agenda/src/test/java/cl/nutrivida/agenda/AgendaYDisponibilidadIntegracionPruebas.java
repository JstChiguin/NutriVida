package cl.nutrivida.agenda;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AgendaYDisponibilidadIntegracionPruebas extends BaseIntegracionAgenda {

    private String rutaAgenda(Persona nutricionista) {
        return "/api/agendas/" + nutricionista.perfilId();
    }

    @Test
    void elProfesionalYElAdministradorDefinenLosHorariosPeroNoOtrosUsuarios() throws Exception {
        Map<String, Object> horarios = Map.of("horarios",
                List.of(Map.of("dia", "MONDAY", "horaInicio", "09:00", "horaFin", "13:00")));

        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), nutricionistaAna, horarios).andExpect(status().isOk());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), administrador, horarios).andExpect(status().isOk());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), nutricionistaBruno, horarios).andExpect(status().isForbidden());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), pacientePedro, horarios).andExpect(status().isForbidden());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), null, horarios).andExpect(status().isUnauthorized());
    }

    @Test
    void rechazaHorariosInvalidosOSuperpuestos() throws Exception {
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), nutricionistaAna, Map.of("horarios",
                List.of(Map.of("dia", "MONDAY", "horaInicio", "09:00", "horaFin", "12:00"),
                        Map.of("dia", "MONDAY", "horaInicio", "11:00", "horaFin", "13:00"))))
                .andExpect(status().isBadRequest());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), nutricionistaAna, Map.of("horarios",
                List.of(Map.of("dia", "MONDAY", "horaInicio", "13:00", "horaFin", "09:00")))).andExpect(status().isBadRequest());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), nutricionistaAna, Map.of("horarios",
                List.of(Map.of("dia", "MONDAY", "horaInicio", "9am", "horaFin", "1pm")))).andExpect(status().isBadRequest());
        ejecutar(put(rutaAgenda(nutricionistaAna) + "/horarios"), nutricionistaAna, Map.of("horarios",
                List.of(Map.of("dia", "MONDAY", "horaInicio", "09:10", "horaFin", "13:00")))).andExpect(status().isBadRequest());
    }

    @Test
    void ofreceHorariosCadaTreintaMinutosDentroDeLaJornada() throws Exception {
        definirJornadaLaboral(nutricionistaAna);

        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + MARTES),
                pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].horarios.length()").value(8))
                .andExpect(jsonPath("$[0].horarios[0].inicio").value(a(MARTES, 9, 0).toString()))
                .andExpect(jsonPath("$[0].horarios[7].fin").value(a(MARTES, 13, 0).toString()));
        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioDeportivoId + "&fecha=" + MARTES),
                pacientePedro, null).andExpect(jsonPath("$[0].horarios.length()").value(7));
    }

    @Test
    void noOfreceHorariosPasadosNiDiasSinJornada() throws Exception {
        definirJornadaLaboral(nutricionistaAna);
        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + java.time.LocalDate.of(2026, 11, 7)),
                pacientePedro, null).andExpect(jsonPath("$[0].horarios.length()").value(0));
        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=2026-11-02"),
                pacientePedro, null).andExpect(jsonPath("$[0].horarios[0].inicio").value(a(java.time.LocalDate.of(2026, 11, 2), 9, 30).toString()));
    }

    @Test
    void consultaLaSemanaCompletaYLimitaElRango() throws Exception {
        definirJornadaLaboral(nutricionistaAna);

        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + MARTES + "&dias=5"),
                pacientePedro, null).andExpect(jsonPath("$.length()").value(5));
        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + MARTES + "&dias=30"),
                pacientePedro, null).andExpect(status().isBadRequest());
        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + MARTES),
                null, null).andExpect(status().isUnauthorized());
    }

    @Test
    void losBloqueosYAusenciasQuitanDisponibilidad() throws Exception {
        definirJornadaLaboral(nutricionistaAna);

        String bloqueoId = leer(ejecutar(post(rutaAgenda(nutricionistaAna) + "/bloqueos"), nutricionistaAna,
                Map.of("inicio", a(MARTES, 10, 0).toString(), "fin", a(MARTES, 11, 0).toString(), "motivo", "Capacitación",
                        "tipo", "BLOQUEO")).andExpect(status().isCreated())).get("bloqueos").get(0).get("identificador").asText();

        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + MARTES),
                pacientePedro, null).andExpect(jsonPath("$[0].horarios.length()").value(6));
        ejecutar(delete(rutaAgenda(nutricionistaAna) + "/bloqueos/" + bloqueoId), nutricionistaAna, null).andExpect(status().isOk());
        ejecutar(get(rutaAgenda(nutricionistaAna) + "/disponibilidad?servicioId=" + servicioControlId + "&fecha=" + MARTES),
                pacientePedro, null).andExpect(jsonPath("$[0].horarios.length()").value(8));
    }

    @Test
    void noPermiteBloquearHorariosConCitasActivas() throws Exception {
        definirJornadaLaboral(nutricionistaAna);
        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 10, 0)))
                .andExpect(status().isCreated());

        ejecutar(post(rutaAgenda(nutricionistaAna) + "/bloqueos"), nutricionistaAna,
                Map.of("inicio", a(MARTES, 9, 30).toString(), "fin", a(MARTES, 10, 30).toString(), "motivo", "Ausencia",
                        "tipo", "AUSENCIA")).andExpect(status().isConflict());
    }

    @Test
    void soloElDuenoOElAdministradorConsultanLaAgendaCompleta() throws Exception {
        definirJornadaLaboral(nutricionistaAna);

        ejecutar(get(rutaAgenda(nutricionistaAna)), nutricionistaAna, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.horariosSemanales.length()").value(5));
        ejecutar(get(rutaAgenda(nutricionistaAna)), administrador, null).andExpect(status().isOk());
        ejecutar(get(rutaAgenda(nutricionistaAna)), nutricionistaBruno, null).andExpect(status().isForbidden());
        ejecutar(get(rutaAgenda(nutricionistaAna)), pacientePedro, null).andExpect(status().isForbidden());
    }
}
