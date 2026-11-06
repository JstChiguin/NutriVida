package cl.nutrivida.autenticacion;

import cl.nutrivida.autenticacion.servicio.ClienteServicioClinico;
import cl.nutrivida.comun.excepciones.ServicioNoDisponible;
import cl.nutrivida.comun.pruebas.RequiereMongoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RequiereMongoDisponible
@SpringBootTest
@AutoConfigureMockMvc
class AutenticacionIntegracionPruebas {

    private static final String CONTRASENA = "Clave1234";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper convertidorJson;
    @Autowired
    private MongoTemplate plantillaMongo;
    @Autowired
    private ServicioTokens servicioTokens;
    @MockitoBean
    private ClienteServicioClinico clienteServicioClinico;

    @BeforeEach
    void limpiarColecciones() {
        plantillaMongo.remove(new org.springframework.data.mongodb.core.query.Query(), "usuarios");
        plantillaMongo.remove(new org.springframework.data.mongodb.core.query.Query(), "tokens_revocados");
        plantillaMongo.remove(new org.springframework.data.mongodb.core.query.Query(), "auditorias");
    }

    private String cuerpoRegistro(String correo) throws Exception {
        return convertidorJson.writeValueAsString(Map.of(
                "nombreCompleto", "Paciente Ficticia Uno",
                "correo", correo,
                "contrasena", CONTRASENA,
                "rut", "12345678-5",
                "telefono", "56912345678"));
    }

    private JsonNode registrar(String correo) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/autenticacion/registro")
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpoRegistro(correo)))
                .andExpect(status().isCreated()).andReturn();
        return convertidorJson.readTree(resultado.getResponse().getContentAsString());
    }

    private String crearAdministradorYObtenerToken() {
        var administrador = plantillaMongo.insert(new cl.nutrivida.autenticacion.modelo.Usuario(
                null, "admin@nutrivida.test", new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                .encode(CONTRASENA), "Administrador Ficticio", Rol.ADMINISTRADOR, true, java.time.Instant.now(),
                java.time.Instant.now(), null, null));
        return servicioTokens.generar(administrador.id(), administrador.correo(), Rol.ADMINISTRADOR);
    }

    @Test
    void registraPacienteConRolPacienteYSinExponerElHash() throws Exception {
        JsonNode respuesta = registrar("ficticia1@nutrivida.test");

        assertThat(respuesta.get("token").asText()).isNotBlank();
        assertThat(respuesta.get("usuario").get("rol").asText()).isEqualTo("PACIENTE");
        assertThat(respuesta.toString()).doesNotContain("hashContrasena");
    }

    @Test
    void guardaLaContrasenaCifradaConBcrypt() throws Exception {
        registrar("ficticia2@nutrivida.test");

        String hash = plantillaMongo.getCollection("usuarios").find().first().getString("hashContrasena");
        assertThat(hash).startsWith("$2").isNotEqualTo(CONTRASENA);
    }

    @Test
    void ignoraUnRolEnviadoEnElRegistroPublico() throws Exception {
        String cuerpo = convertidorJson.writeValueAsString(Map.of(
                "nombreCompleto", "Intento Escalada", "correo", "escalada@nutrivida.test",
                "contrasena", CONTRASENA, "rol", "ADMINISTRADOR"));

        mockMvc.perform(post("/api/autenticacion/registro").contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("PACIENTE"));
    }

    @Test
    void rechazaCorreoDuplicadoConConflicto() throws Exception {
        registrar("repetido@nutrivida.test");

        mockMvc.perform(post("/api/autenticacion/registro").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoRegistro("REPETIDO@nutrivida.test")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CONFLICTO_DE_NEGOCIO"));
    }

    @Test
    void rechazaContrasenaDebilConDetalleDeValidacion() throws Exception {
        String cuerpo = convertidorJson.writeValueAsString(Map.of(
                "nombreCompleto", "Paciente Debil", "correo", "debil@nutrivida.test", "contrasena", "abcdefgh"));

        mockMvc.perform(post("/api/autenticacion/registro").contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACION_FALLIDA"));
    }

    @Test
    void eliminaElUsuarioSiNoSePuedeCrearElPerfilClinico() throws Exception {
        doThrow(new ServicioNoDisponible("clinico caído")).when(clienteServicioClinico).crearPerfilPaciente(any());

        mockMvc.perform(post("/api/autenticacion/registro").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoRegistro("sinperfil@nutrivida.test")))
                .andExpect(status().isServiceUnavailable());

        assertThat(plantillaMongo.getCollection("usuarios").countDocuments()).isZero();
    }

    @Test
    void iniciaSesionConCredencialesCorrectas() throws Exception {
        registrar("login@nutrivida.test");

        mockMvc.perform(post("/api/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(
                                Map.of("correo", "login@nutrivida.test", "contrasena", CONTRASENA))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tipo").value("Bearer"));
    }

    @Test
    void rechazaCredencialesIncorrectasConMensajeGenerico() throws Exception {
        registrar("clave@nutrivida.test");

        mockMvc.perform(post("/api/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(
                                Map.of("correo", "clave@nutrivida.test", "contrasena", "Incorrecta99"))))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(
                                Map.of("correo", "noexiste@nutrivida.test", "contrasena", CONTRASENA))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void impideIniciarSesionAUnaCuentaDesactivada() throws Exception {
        JsonNode sesion = registrar("inactiva@nutrivida.test");
        String administrador = crearAdministradorYObtenerToken();

        mockMvc.perform(patch("/api/usuarios/" + sesion.get("usuario").get("id").asText() + "/estado")
                        .header("Authorization", "Bearer " + administrador)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(
                                Map.of("correo", "inactiva@nutrivida.test", "contrasena", CONTRASENA))))
                .andExpect(status().isForbidden());
    }

    @Test
    void cerrarSesionRevocaElToken() throws Exception {
        String token = registrar("salida@nutrivida.test").get("token").asText();

        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/autenticacion/cerrar-sesion").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exigeAutenticacionEnEndpointsProtegidos() throws Exception {
        mockMvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/usuarios").header("Authorization", "Bearer token-falso"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void impideAUnPacienteAdministrarUsuarios() throws Exception {
        String token = registrar("normal@nutrivida.test").get("token").asText();

        mockMvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void administradorCreaConsultaCambiaRolYDesactivaUsuarios() throws Exception {
        String administrador = crearAdministradorYObtenerToken();

        MvcResult creado = mockMvc.perform(post("/api/usuarios").header("Authorization", "Bearer " + administrador)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(Map.of(
                                "nombreCompleto", "Nutricionista Ficticia", "correo", "nutri@nutrivida.test",
                                "contrasena", CONTRASENA, "rol", "NUTRICIONISTA"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rol").value("NUTRICIONISTA")).andReturn();
        String usuarioId = convertidorJson.readTree(creado.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/usuarios?rol=NUTRICIONISTA").header("Authorization", "Bearer " + administrador))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1));
        mockMvc.perform(patch("/api/usuarios/" + usuarioId + "/rol").header("Authorization", "Bearer " + administrador)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"PACIENTE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rol").value("PACIENTE"));
        mockMvc.perform(delete("/api/usuarios/" + usuarioId).header("Authorization", "Bearer " + administrador))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/usuarios/" + usuarioId).header("Authorization", "Bearer " + administrador))
                .andExpect(jsonPath("$.activo").value(false));
        assertThat(plantillaMongo.getCollection("auditorias").countDocuments()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void administradorNoPuedeAsignarElRolDeServicioInterno() throws Exception {
        String administrador = crearAdministradorYObtenerToken();

        mockMvc.perform(post("/api/usuarios").header("Authorization", "Bearer " + administrador)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(Map.of(
                                "nombreCompleto", "Servicio Falso", "correo", "servicio@nutrivida.test",
                                "contrasena", CONTRASENA, "rol", "SERVICIO_INTERNO"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rechazaTokenInternoComoSesionDeUsuario() throws Exception {
        String tokenInterno = servicioTokens.generar("servicio", "interno@nutrivida.local", Rol.SERVICIO_INTERNO,
                Duration.ofMinutes(1));

        mockMvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + tokenInterno))
                .andExpect(status().isForbidden());
    }

    @Test
    void respondeConErroresEstructuradosParaRutasInexistentesYMetodosNoPermitidos() throws Exception {
        String token = servicioTokens.generar("u1", "admin@nutrivida.test", Rol.ADMINISTRADOR);

        mockMvc.perform(get("/api/ruta-inexistente").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RUTA_NO_ENCONTRADA"));
        mockMvc.perform(delete("/api/autenticacion/iniciar-sesion").header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.codigo").value("METODO_NO_PERMITIDO"));
    }
}
