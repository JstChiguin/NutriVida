package cl.nutrivida.clinico;

import cl.nutrivida.clinico.modelo.Nutricionista;
import cl.nutrivida.clinico.modelo.Paciente;
import cl.nutrivida.clinico.modelo.ServicioNutricional;
import cl.nutrivida.clinico.repositorio.RepositorioNutricionistas;
import cl.nutrivida.clinico.repositorio.RepositorioPacientes;
import cl.nutrivida.clinico.repositorio.RepositorioServicios;
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
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.List;

@RequiereMongoDisponible
@SpringBootTest
@AutoConfigureMockMvc
abstract class BaseIntegracionClinica {

    @Autowired
    protected MockMvc mockMvc;
    @Autowired
    protected ObjectMapper convertidorJson;
    @Autowired
    protected MongoTemplate plantillaMongo;
    @Autowired
    protected ServicioTokens servicioTokens;
    @Autowired
    protected RepositorioPacientes repositorioPacientes;
    @Autowired
    protected RepositorioNutricionistas repositorioNutricionistas;
    @Autowired
    protected RepositorioServicios repositorioServicios;

    protected Persona administrador;
    protected Persona nutricionistaAna;
    protected Persona nutricionistaBruno;
    protected Persona pacientePedro;
    protected Persona pacientePaula;
    protected ServicioNutricional servicioControl;

    protected record Persona(String usuarioId, String perfilId, String token) {
    }

    @BeforeEach
    void prepararDatosBase() {
        for (String coleccion : List.of("pacientes", "nutricionistas", "servicios", "fichas_clinicas", "mediciones",
                "planes_alimentarios", "solicitudes_contacto", "auditorias")) {
            plantillaMongo.remove(new org.springframework.data.mongodb.core.query.Query(), coleccion);
        }
        administrador = new Persona(new ObjectId().toHexString(), null, null);
        administrador = new Persona(administrador.usuarioId(), null,
                servicioTokens.generar(administrador.usuarioId(), "admin@nutrivida.test", Rol.ADMINISTRADOR));
        servicioControl = repositorioServicios.save(new ServicioNutricional(null, "Control nutricional",
                "Control de seguimiento", "Seguimiento", 30, 25000, true, Instant.now(), Instant.now(), null));
        nutricionistaAna = crearNutricionista("Ana Ficticia", "ana@nutrivida.test");
        nutricionistaBruno = crearNutricionista("Bruno Ficticio", "bruno@nutrivida.test");
        pacientePedro = crearPaciente("Pedro Ficticio", "pedro@nutrivida.test", "11111111-1");
        pacientePaula = crearPaciente("Paula Ficticia", "paula@nutrivida.test", "22222222-2");
    }

    protected Persona crearNutricionista(String nombre, String correo) {
        String usuarioId = new ObjectId().toHexString();
        Nutricionista guardado = repositorioNutricionistas.save(new Nutricionista(null, usuarioId, nombre,
                "Nutricionista", List.of("Nutrición clínica"), "Perfil ficticio", null, List.of(servicioControl.id()),
                true, Instant.now(), Instant.now(), null));
        return new Persona(usuarioId, guardado.id(), servicioTokens.generar(usuarioId, correo, Rol.NUTRICIONISTA));
    }

    protected Persona crearPaciente(String nombre, String correo, String rut) {
        String usuarioId = new ObjectId().toHexString();
        Paciente guardado = repositorioPacientes.save(new Paciente(null, usuarioId, nombre, rut, correo, "56911112222",
                "1990-05-20", "OTRO", null, true, null, Instant.now(), Instant.now(), null));
        return new Persona(usuarioId, guardado.id(), servicioTokens.generar(usuarioId, correo, Rol.PACIENTE));
    }

    protected void autorizar(Persona nutricionista, Persona paciente) {
        org.springframework.data.mongodb.core.query.Query consulta = org.springframework.data.mongodb.core.query.Query
                .query(org.springframework.data.mongodb.core.query.Criteria.where("_id").is(paciente.perfilId()));
        plantillaMongo.updateFirst(consulta, new org.springframework.data.mongodb.core.query.Update()
                .addToSet("nutricionistasAutorizados", nutricionista.perfilId()), Paciente.class);
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
