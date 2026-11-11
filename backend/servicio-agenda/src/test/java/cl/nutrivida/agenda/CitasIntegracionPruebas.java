package cl.nutrivida.agenda;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CitasIntegracionPruebas extends BaseIntegracionAgenda {

    @BeforeEach
    void definirAgendas() throws Exception {
        definirJornadaLaboral(nutricionistaAna);
        definirJornadaLaboral(nutricionistaBruno);
    }

    private JsonNode solicitar(Persona paciente, Persona nutricionista, String servicioId, Instant inicio) throws Exception {
        return leer(ejecutar(post("/api/citas"), paciente, solicitudCita(nutricionista, servicioId, inicio))
                .andExpect(status().isCreated()));
    }

    private long contarBloquesOcupados() {
        return plantillaMongo.getCollection("ocupaciones_agenda").countDocuments();
    }

    @Test
    void solicitaUnaCitaConEstadoHistorialYBloquesReservados() throws Exception {
        JsonNode cita = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));

        assertThat(cita.get("estado").asText()).isEqualTo("SOLICITADA");
        assertThat(cita.get("nombrePaciente").asText()).isEqualTo("Pedro Ficticio");
        assertThat(cita.get("fin").asText()).isEqualTo(a(MARTES, 9, 30).toString());
        assertThat(cita.get("historialEstados")).hasSize(1);
        assertThat(cita.get("historialEstados").get(0).get("evento").asText()).isEqualTo("SOLICITUD");
        assertThat(contarBloquesOcupados()).isEqualTo(2);
    }

    @Test
    void impideReservarUnHorarioOcupadoOSuperpuesto() throws Exception {
        solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));

        ejecutar(post("/api/citas"), pacientePaula, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 0)))
                .andExpect(status().isConflict());
        ejecutar(post("/api/citas"), pacientePaula, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 15)))
                .andExpect(status().isConflict());
        ejecutar(post("/api/citas"), pacientePaula, solicitudCita(nutricionistaAna, servicioDeportivoId, a(MARTES, 8, 30)))
                .andExpect(status().isConflict());
        ejecutar(post("/api/citas"), pacientePaula, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 30)))
                .andExpect(status().isCreated());
    }

    @Test
    void rechazaFechasPasadasHorasDesalineadasYFueraDeJornada() throws Exception {
        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(java.time.LocalDate.of(2026, 10, 30), 9, 0)))
                .andExpect(status().isBadRequest());
        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 10)))
                .andExpect(status().isBadRequest());
        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 15, 0)))
                .andExpect(status().isConflict());
        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 12, 45)))
                .andExpect(status().isConflict());
        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(java.time.LocalDate.of(2026, 11, 7), 10, 0)))
                .andExpect(status().isConflict());
        assertThat(contarBloquesOcupados()).isZero();
    }

    @Test
    void respetaLosBloqueosDeLaAgenda() throws Exception {
        ejecutar(post("/api/agendas/" + nutricionistaAna.perfilId() + "/bloqueos"), nutricionistaAna,
                Map.of("inicio", a(MARTES, 10, 0).toString(), "fin", a(MARTES, 11, 0).toString(), "motivo", "Reunión",
                        "tipo", "BLOQUEO")).andExpect(status().isCreated());

        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 10, 30)))
                .andExpect(status().isConflict());
    }

    @Test
    void impideQueUnPacienteTengaDosCitasSuperpuestasConDistintosProfesionales() throws Exception {
        solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));

        ejecutar(post("/api/citas"), pacientePedro, solicitudCita(nutricionistaBruno, servicioControlId, a(MARTES, 9, 15)))
                .andExpect(status().isConflict());
        assertThat(contarBloquesOcupados()).isEqualTo(2);
    }

    @Test
    void validaServicioYProfesionalDeLaSolicitud() throws Exception {
        ejecutar(post("/api/citas"), pacientePedro, Map.of("nutricionistaId", nutricionistaAna.perfilId(),
                "servicioId", new org.bson.types.ObjectId().toHexString(), "inicio", a(MARTES, 9, 0).toString(),
                "motivoConsulta", "Control")).andExpect(status().isNotFound());
        ejecutar(post("/api/citas"), pacientePedro, Map.of("nutricionistaId", nutricionistaAna.perfilId(),
                "servicioId", servicioControlId, "inicio", a(MARTES, 9, 0).toString())).andExpect(status().isBadRequest());
        ejecutar(post("/api/citas"), nutricionistaAna, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 0)))
                .andExpect(status().isForbidden());
        ejecutar(post("/api/citas"), null, solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 0)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protegeContraReservasSimultaneasDelMismoHorario() throws Exception {
        ExecutorService ejecutor = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> reservaDePedro = () -> ejecutar(post("/api/citas"), pacientePedro,
                    solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 11, 0))).andReturn().getResponse().getStatus();
            Callable<Integer> reservaDePaula = () -> ejecutar(post("/api/citas"), pacientePaula,
                    solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 11, 0))).andReturn().getResponse().getStatus();
            Future<Integer> primera = ejecutor.submit(reservaDePedro);
            Future<Integer> segunda = ejecutor.submit(reservaDePaula);

            assertThat(List.of(primera.get(), segunda.get())).containsExactlyInAnyOrder(201, 409);
            assertThat(plantillaMongo.getCollection("citas").countDocuments()).isEqualTo(1);
            assertThat(contarBloquesOcupados()).isEqualTo(2);
        } finally {
            ejecutor.shutdownNow();
        }
    }

    @Test
    void elProfesionalAsignadoConfirmaYSeAutorizaSobreElPaciente() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();

        ejecutar(patch("/api/citas/" + citaId + "/confirmacion"), nutricionistaBruno, null).andExpect(status().isForbidden());
        ejecutar(patch("/api/citas/" + citaId + "/confirmacion"), pacientePedro, null).andExpect(status().isForbidden());
        ejecutar(patch("/api/citas/" + citaId + "/confirmacion"), nutricionistaAna, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CONFIRMADA"))
                .andExpect(jsonPath("$.historialEstados.length()").value(2));
        assertThat(clienteClinico.autorizaciones).hasSize(1).first().asString().endsWith(nutricionistaAna.perfilId());
        ejecutar(patch("/api/citas/" + citaId + "/confirmacion"), nutricionistaAna, null).andExpect(status().isConflict());
    }

    @Test
    void rechazarUnaCitaLiberaElHorario() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();

        ejecutar(patch("/api/citas/" + citaId + "/rechazo"), nutricionistaAna, Map.of("motivo", "Agenda completa"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("RECHAZADA"));

        assertThat(contarBloquesOcupados()).isZero();
        solicitar(pacientePaula, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
    }

    @Test
    void elPacienteCancelaConAnticipacionYSeLiberaElHorario() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();

        ejecutar(patch("/api/citas/" + citaId + "/cancelacion"), pacientePaula, Map.of("motivo", "Ajena"))
                .andExpect(status().isForbidden());
        ejecutar(patch("/api/citas/" + citaId + "/cancelacion"), pacientePedro, Map.of("motivo", "Viaje"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CANCELADA"));
        ejecutar(patch("/api/citas/" + citaId + "/cancelacion"), pacientePedro, Map.of("motivo", "Otra vez"))
                .andExpect(status().isConflict());

        assertThat(contarBloquesOcupados()).isZero();
    }

    @Test
    void elPacienteNoPuedeCancelarConMenosDeLaAnticipacionMinimaPeroElAdministradorSi() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(java.time.LocalDate.of(2026, 11, 2), 10, 0))
                .get("id").asText();

        ejecutar(patch("/api/citas/" + citaId + "/cancelacion"), pacientePedro, Map.of("motivo", "Tarde"))
                .andExpect(status().isConflict());
        ejecutar(patch("/api/citas/" + citaId + "/cancelacion"), administrador, Map.of("motivo", "Gestión clínica"))
                .andExpect(status().isOk());
    }

    @Test
    void reprogramaMoviendoLosBloquesYRegistrandoElEvento() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();
        ejecutar(patch("/api/citas/" + citaId + "/confirmacion"), nutricionistaAna, null).andExpect(status().isOk());

        ejecutar(patch("/api/citas/" + citaId + "/reprogramacion"), pacientePedro,
                Map.of("nuevoInicio", a(MIERCOLES, 10, 0).toString(), "motivo", "Cambio de turno"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("SOLICITADA"))
                .andExpect(jsonPath("$.inicio").value(a(MIERCOLES, 10, 0).toString()))
                .andExpect(jsonPath("$.historialEstados[2].evento").value("REPROGRAMACION"));

        assertThat(contarBloquesOcupados()).isEqualTo(2);
        solicitar(pacientePaula, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
    }

    @Test
    void siElNuevoHorarioEstaOcupadoLaReprogramacionFallaSinAfectarLaCita() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();
        solicitar(pacientePaula, nutricionistaAna, servicioControlId, a(MARTES, 10, 0));

        ejecutar(patch("/api/citas/" + citaId + "/reprogramacion"), pacientePedro,
                Map.of("nuevoInicio", a(MARTES, 10, 0).toString(), "motivo", "Intento")).andExpect(status().isConflict());

        ejecutar(get("/api/citas/" + citaId), pacientePedro, null).andExpect(jsonPath("$.inicio").value(a(MARTES, 9, 0).toString()));
        assertThat(contarBloquesOcupados()).isEqualTo(4);
    }

    @Test
    void permiteReprogramarUnaCitaHaciaUnHorarioQueSuperponeConSuPropiaReserva() throws Exception {
        String citaId = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();

        ejecutar(patch("/api/citas/" + citaId + "/reprogramacion"), nutricionistaAna,
                Map.of("nuevoInicio", a(MARTES, 9, 15).toString(), "motivo", "Ajuste de 15 minutos"))
                .andExpect(status().isOk());

        assertThat(contarBloquesOcupados()).isEqualTo(2);
    }

    @Test
    void registraAtencionRealizadaEInasistenciaSoloDespuesDelInicioYDesdeConfirmada() throws Exception {
        String futura = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();
        ejecutar(patch("/api/citas/" + futura + "/confirmacion"), nutricionistaAna, null).andExpect(status().isOk());
        ejecutar(patch("/api/citas/" + futura + "/atencion-realizada"), nutricionistaAna, null).andExpect(status().isConflict());

        String pasada = insertarCitaConfirmadaPasada(pacientePaula);
        ejecutar(patch("/api/citas/" + pasada + "/atencion-realizada"), nutricionistaBruno, null).andExpect(status().isForbidden());
        ejecutar(patch("/api/citas/" + pasada + "/atencion-realizada"), nutricionistaAna, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("REALIZADA"));
        ejecutar(patch("/api/citas/" + pasada + "/cancelacion"), administrador, Map.of("motivo", "Tarde"))
                .andExpect(status().isConflict());
        ejecutar(patch("/api/citas/" + pasada + "/inasistencia"), nutricionistaAna, null).andExpect(status().isConflict());
    }

    private String insertarCitaConfirmadaPasada(Persona paciente) {
        var resumen = clienteClinico.pacientesPorUsuario.get(paciente.usuarioId());
        String id = new org.bson.types.ObjectId().toHexString();
        Instant inicio = a(java.time.LocalDate.of(2026, 10, 28), 9, 0);
        var cambio = new cl.nutrivida.agenda.modelo.Cita.CambioEstado(cl.nutrivida.agenda.modelo.Cita.EventoCita.SOLICITUD,
                cl.nutrivida.agenda.modelo.Cita.EstadoCita.SOLICITADA, inicio.minusSeconds(3600), paciente.usuarioId(), "Control");
        plantillaMongo.insert(new cl.nutrivida.agenda.modelo.Cita(id, resumen.id(), resumen.nombreCompleto(),
                nutricionistaAna.perfilId(), "Ana Ficticia", servicioControlId, "Control nutricional", 30, 25000, inicio,
                inicio.plusSeconds(1800), "Control", cl.nutrivida.agenda.modelo.Cita.EstadoCita.CONFIRMADA, false,
                List.of(cambio), inicio.minusSeconds(3600), inicio.minusSeconds(3600), null));
        return id;
    }

    @Test
    void cadaRolSoloVeLasCitasQueLeCorresponden() throws Exception {
        String citaDePedro = solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0)).get("id").asText();
        solicitar(pacientePaula, nutricionistaBruno, servicioControlId, a(MARTES, 9, 0));

        ejecutar(get("/api/citas"), pacientePedro, null).andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/citas"), nutricionistaAna, null).andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/citas"), administrador, null).andExpect(jsonPath("$.totalElementos").value(2));
        ejecutar(get("/api/citas?pacienteId=" + clienteClinico.pacientesPorUsuario.get(pacientePaula.usuarioId()).id()),
                pacientePedro, null).andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/citas/" + citaDePedro), pacientePaula, null).andExpect(status().isForbidden());
        ejecutar(get("/api/citas/" + citaDePedro), nutricionistaBruno, null).andExpect(status().isForbidden());
        ejecutar(get("/api/citas/" + citaDePedro), nutricionistaAna, null).andExpect(status().isOk());
        ejecutar(get("/api/citas/" + citaDePedro), null, null).andExpect(status().isUnauthorized());
    }

    @Test
    void filtraYOrdenaLasCitasPorEstadoYFechas() throws Exception {
        solicitar(pacientePedro, nutricionistaAna, servicioControlId, a(MARTES, 9, 0));
        String segunda = solicitar(pacientePaula, nutricionistaAna, servicioControlId, a(MARTES, 11, 0)).get("id").asText();
        ejecutar(patch("/api/citas/" + segunda + "/confirmacion"), nutricionistaAna, null).andExpect(status().isOk());

        ejecutar(get("/api/citas?estado=CONFIRMADA"), administrador, null).andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/citas?descendente=true"), administrador, null)
                .andExpect(jsonPath("$.contenido[0].id").value(segunda));
        ejecutar(get("/api/citas?desde=" + a(MARTES, 10, 0) + "&hasta=" + a(MARTES, 12, 0)), administrador, null)
                .andExpect(jsonPath("$.totalElementos").value(1));
        ejecutar(get("/api/citas?tamano=1&pagina=1"), administrador, null)
                .andExpect(jsonPath("$.contenido.length()").value(1)).andExpect(jsonPath("$.totalPaginas").value(2));
    }

    @Test
    void elAdministradorSolicitaCitasEnNombreDeUnPaciente() throws Exception {
        String pacienteId = clienteClinico.pacientesPorUsuario.get(pacientePedro.usuarioId()).id();
        Map<String, Object> cuerpo = new java.util.HashMap<>(solicitudCita(nutricionistaAna, servicioControlId, a(MARTES, 9, 0)));

        ejecutar(post("/api/citas"), administrador, cuerpo).andExpect(status().isBadRequest());
        cuerpo.put("pacienteId", pacienteId);
        ejecutar(post("/api/citas"), administrador, cuerpo).andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombrePaciente").value("Pedro Ficticio"));
    }

    @Test
    void elValidadorDeEsquemaRechazaCitasInvalidasEnMongo() {
        org.bson.Document invalida = new org.bson.Document("estado", "INVENTADA");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> plantillaMongo.getCollection("citas").insertOne(invalida))
                .isInstanceOf(com.mongodb.MongoWriteException.class);
    }
}
