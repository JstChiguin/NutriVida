package cl.nutrivida.autenticacion;

import cl.nutrivida.autenticacion.servicio.ClienteServicioClinico;
import cl.nutrivida.comun.pruebas.RequiereMongoDisponible;
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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RequiereMongoDisponible
@SpringBootTest
@AutoConfigureMockMvc
class VersionadoApiIntegracionPruebas {

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
                "nombreCompleto", "Paciente Ficticia Versionada", "correo", correo, "contrasena", CONTRASENA,
                "rut", "12345678-5", "telefono", "56912345678"));
    }

    private String cuerpoInicioSesion(String correo) throws Exception {
        return convertidorJson.writeValueAsString(Map.of("correo", correo, "contrasena", CONTRASENA));
    }

    @Test
    void registraEIniciaSesionEnLaRutaVersionadaSinMarcarlaComoObsoleta() throws Exception {
        mockMvc.perform(post("/api/v1/autenticacion/registro").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoRegistro("v1@nutrivida.test")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("PACIENTE"))
                .andExpect(header().doesNotExist("Deprecation"));

        mockMvc.perform(post("/api/v1/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoInicioSesion("v1@nutrivida.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tipo").value("Bearer"));
    }

    @Test
    void laRutaAntiguaDeInicioDeSesionSigueFuncionandoYAvisaDeLaVersionSucesora() throws Exception {
        mockMvc.perform(post("/api/v1/autenticacion/registro").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpoRegistro("antigua@nutrivida.test"))).andExpect(status().isCreated());

        mockMvc.perform(post("/api/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoInicioSesion("antigua@nutrivida.test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Link",
                        "</api/v1/autenticacion/iniciar-sesion>; rel=\"successor-version\""));
    }

    @Test
    void rechazaCredencialesIncorrectasEnLaRutaVersionada() throws Exception {
        mockMvc.perform(post("/api/v1/autenticacion/registro").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpoRegistro("clave@nutrivida.test"))).andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(
                                Map.of("correo", "clave@nutrivida.test", "contrasena", "Incorrecta99"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cerrarSesionRevocaElTokenEnLaRutaVersionada() throws Exception {
        MvcResult registro = mockMvc.perform(post("/api/v1/autenticacion/registro")
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpoRegistro("cierre@nutrivida.test")))
                .andExpect(status().isCreated()).andReturn();
        JsonNode sesion = convertidorJson.readTree(registro.getResponse().getContentAsString());
        String token = sesion.get("token").asText();

        mockMvc.perform(get("/api/v1/autenticacion/yo").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.correo").value("cierre@nutrivida.test"));
        mockMvc.perform(post("/api/v1/autenticacion/cerrar-sesion").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/autenticacion/yo").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exigeTokenParaLosUsuariosEnAmbasRutas() throws Exception {
        mockMvc.perform(get("/api/v1/usuarios")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());

        MvcResult registro = mockMvc.perform(post("/api/v1/autenticacion/registro")
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpoRegistro("rol@nutrivida.test")))
                .andExpect(status().isCreated()).andReturn();
        String token = convertidorJson.readTree(registro.getResponse().getContentAsString()).get("token").asText();
        assertThat(servicioTokens.validar(token)).isPresent();
        mockMvc.perform(get("/api/v1/usuarios").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
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
