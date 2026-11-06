package cl.nutrivida.agenda;

import cl.nutrivida.agenda.clinico.ClienteClinico;
import cl.nutrivida.agenda.clinico.ResumenNutricionista;
import cl.nutrivida.agenda.clinico.ResumenPaciente;
import cl.nutrivida.agenda.clinico.ResumenServicio;
import cl.nutrivida.comun.pruebas.RequiereMongoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@RequiereMongoDisponible
@SpringBootTest
@AutoConfigureMockMvc
@Import(BaseIntegracionAgenda.ConfiguracionDePruebas.class)
abstract class BaseIntegracionAgenda {

    static final ZoneId SANTIAGO = ZoneId.of("America/Santiago");
    static final Instant AHORA = Instant.parse("2026-11-02T12:00:00Z");
    static final LocalDate MARTES = LocalDate.of(2026, 11, 3);
    static final LocalDate MIERCOLES = LocalDate.of(2026, 11, 4);

    @TestConfiguration
    static class ConfiguracionDePruebas {

        @Bean
        @Primary
        Clock relojFijo() {
            return Clock.fixed(AHORA, ZoneOffset.UTC);
        }

        @Bean
        @Primary
        ClienteClinicoFalso clienteClinicoFalso() {
            return new ClienteClinicoFalso();
        }
    }

    @Autowired
    protected MockMvc mockMvc;
    @Autowired
    protected ObjectMapper convertidorJson;
    @Autowired
    protected MongoTemplate plantillaMongo;
    @Autowired
    protected ServicioTokens servicioTokens;
    @Autowired
    protected ClienteClinicoFalso clienteClinico;

    protected Persona administrador;
    protected Persona nutricionistaAna;
    protected Persona nutricionistaBruno;
    protected Persona pacientePedro;
    protected Persona pacientePaula;
    protected String servicioControlId;
    protected String servicioDeportivoId;

    protected record Persona(String usuarioId, String perfilId, String token) {
    }

    @BeforeEach
    void prepararEscenario() {
        for (String coleccion : List.of("agendas", "citas", "ocupaciones_agenda", "pagos", "auditorias")) {
            plantillaMongo.remove(new Query(), coleccion);
        }
        clienteClinico.limpiar();
        servicioControlId = new ObjectId().toHexString();
        servicioDeportivoId = new ObjectId().toHexString();
        clienteClinico.servicios.put(servicioControlId, new ResumenServicio(servicioControlId, "Control nutricional", 30, 25000, true));
        clienteClinico.servicios.put(servicioDeportivoId, new ResumenServicio(servicioDeportivoId, "Nutrición deportiva", 60, 40000, true));
        administrador = persona(Rol.ADMINISTRADOR, null);
        nutricionistaAna = crearNutricionista("Ana Ficticia");
        nutricionistaBruno = crearNutricionista("Bruno Ficticio");
        pacientePedro = crearPaciente("Pedro Ficticio");
        pacientePaula = crearPaciente("Paula Ficticia");
    }

    protected Persona persona(Rol rol, String perfilId) {
        String usuarioId = new ObjectId().toHexString();
        return new Persona(usuarioId, perfilId, servicioTokens.generar(usuarioId, usuarioId + "@nutrivida.test", rol));
    }

    protected Persona crearNutricionista(String nombre) {
        String perfilId = new ObjectId().toHexString();
        Persona persona = persona(Rol.NUTRICIONISTA, perfilId);
        ResumenNutricionista resumen = new ResumenNutricionista(perfilId, nombre,
                List.of(servicioControlId, servicioDeportivoId), true);
        clienteClinico.nutricionistasPorUsuario.put(persona.usuarioId(), resumen);
        clienteClinico.nutricionistasPorId.put(perfilId, resumen);
        return persona;
    }

    protected Persona crearPaciente(String nombre) {
        String perfilId = new ObjectId().toHexString();
        Persona persona = persona(Rol.PACIENTE, perfilId);
        clienteClinico.pacientesPorUsuario.put(persona.usuarioId(), new ResumenPaciente(perfilId, persona.usuarioId(), nombre, true));
        return persona;
    }

    protected Instant a(LocalDate fecha, int hora, int minuto) {
        return fecha.atTime(hora, minuto).atZone(SANTIAGO).toInstant();
    }

    protected void definirJornadaLaboral(Persona nutricionista) throws Exception {
        List<Map<String, String>> horarios = new java.util.ArrayList<>();
        for (String dia : List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY")) {
            horarios.add(Map.of("dia", dia, "horaInicio", "09:00", "horaFin", "13:00"));
        }
        ejecutar(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .put("/api/agendas/" + nutricionista.perfilId() + "/horarios"), nutricionista, Map.of("horarios", horarios))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
    }

    protected Map<String, Object> solicitudCita(Persona nutricionista, String servicioId, Instant inicio) {
        return Map.of("nutricionistaId", nutricionista.perfilId(), "servicioId", servicioId, "inicio", inicio.toString(),
                "motivoConsulta", "Control de peso");
    }

    protected ResultActions ejecutar(MockHttpServletRequestBuilder peticion, Persona persona, Object cuerpo) throws Exception {
        if (persona != null) {
            peticion.header("Authorization", "Bearer " + persona.token());
        }
        if (cuerpo != null) {
            peticion.contentType(MediaType.APPLICATION_JSON).content(convertidorJson.writeValueAsString(cuerpo));
        }
        return mockMvc.perform(peticion);
    }

    protected JsonNode leer(ResultActions resultado) throws Exception {
        return convertidorJson.readTree(resultado.andReturn().getResponse().getContentAsString());
    }
}
