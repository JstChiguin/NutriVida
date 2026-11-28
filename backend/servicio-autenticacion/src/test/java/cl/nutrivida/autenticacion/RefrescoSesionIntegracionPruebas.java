package cl.nutrivida.autenticacion;

import cl.nutrivida.autenticacion.modelo.TokenRefresco;
import cl.nutrivida.autenticacion.modelo.Usuario;
import cl.nutrivida.autenticacion.servicio.ClienteServicioClinico;
import cl.nutrivida.comun.pruebas.RequiereMongoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.ArrayList;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RequiereMongoDisponible
@SpringBootTest
@AutoConfigureMockMvc
class RefrescoSesionIntegracionPruebas {

    private static final String CONTRASENA = "Clave1234";
    private static final String COOKIE = "nutrivida_refresco";
    private static final String CABECERA = "X-Nutrivida-Csrf";

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

    private record Sesion(String token, String refresco, String usuarioId) {
    }

    @BeforeEach
    void limpiar() {
        for (String coleccion : List.of("usuarios", "tokens_revocados", "tokens_refresco", "usuarios_invalidados", "auditorias")) {
            plantillaMongo.remove(new Query(), coleccion);
        }
    }

    private String valorCookie(MvcResult resultado) {
        String cabecera = resultado.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cabecera).contains(COOKIE + "=");
        return cabecera.substring(cabecera.indexOf('=') + 1, cabecera.indexOf(';'));
    }

    private String cuerpoRegistro(String correo) throws Exception {
        return convertidorJson.writeValueAsString(Map.of("nombreCompleto", "Paciente Ficticio Refresco",
                "correo", correo, "contrasena", CONTRASENA, "rut", "12345678-5", "telefono", "56912345678"));
    }

    private Sesion registrar(String correo) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/autenticacion/registro")
                        .contentType(MediaType.APPLICATION_JSON).content(cuerpoRegistro(correo)))
                .andExpect(status().isCreated()).andReturn();
        JsonNode cuerpo = convertidorJson.readTree(resultado.getResponse().getContentAsString());
        return new Sesion(cuerpo.get("token").asText(), valorCookie(resultado), cuerpo.get("usuario").get("id").asText());
    }

    private MvcResult refrescar(String refresco, int estadoEsperado) throws Exception {
        var solicitud = post("/api/autenticacion/refrescar").header(CABECERA, "1");
        if (refresco != null) {
            solicitud = solicitud.cookie(new Cookie(COOKIE, refresco));
        }
        return mockMvc.perform(solicitud).andExpect(status().is(estadoEsperado)).andReturn();
    }

    private String tokenAdministrador() {
        Usuario administrador = plantillaMongo.insert(new Usuario(null, "admin@nutrivida.test",
                new BCryptPasswordEncoder().encode(CONTRASENA), "Administrador Ficticio", Rol.ADMINISTRADOR, true,
                Instant.now(), Instant.now(), null, null));
        return servicioTokens.generar(administrador.id(), administrador.correo(), Rol.ADMINISTRADOR);
    }

    @Test
    void elInicioDeSesionEntregaCookieHttpOnlyYNoGuardaElValorEnClaro() throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/autenticacion/registro")
                .contentType(MediaType.APPLICATION_JSON).content(cuerpoRegistro("cookie@nutrivida.test"))).andReturn();

        String cabecera = resultado.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(cabecera).contains("HttpOnly").contains("SameSite=Lax").contains("Path=/api/v1/autenticacion");
        String valor = valorCookie(resultado);
        assertThat(plantillaMongo.findById(valor, TokenRefresco.class)).isNull();
        assertThat(plantillaMongo.count(new Query(), TokenRefresco.class)).isEqualTo(1);
        assertThat(resultado.getResponse().getContentAsString()).doesNotContain(valor);
    }

    @Test
    void refrescarEntregaNuevoTokenDeAccesoYRotaLaCookie() throws Exception {
        Sesion sesion = registrar("rotar@nutrivida.test");

        MvcResult resultado = refrescar(sesion.refresco(), 200);
        JsonNode cuerpo = convertidorJson.readTree(resultado.getResponse().getContentAsString());

        assertThat(cuerpo.get("token").asText()).isNotBlank().isNotEqualTo(sesion.token());
        assertThat(valorCookie(resultado)).isNotEqualTo(sesion.refresco());
        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + cuerpo.get("token").asText()))
                .andExpect(status().isOk());
    }

    @Test
    void laRenovacionExigeLaCabeceraAntiCsrf() throws Exception {
        Sesion sesion = registrar("csrf@nutrivida.test");

        mockMvc.perform(post("/api/autenticacion/refrescar").cookie(new Cookie(COOKIE, sesion.refresco())))
                .andExpect(status().isForbidden());
    }

    @Test
    void sinCookieOConCookieInventadaLaRenovacionEsRechazada() throws Exception {
        refrescar(null, 401);
        refrescar("valor-inventado", 401);
    }

    @Test
    void unRefrescoExpiradoEsRechazado() throws Exception {
        Sesion sesion = registrar("expirado@nutrivida.test");
        plantillaMongo.updateMulti(new Query(), new Update().set("sesionExpiraEn", Instant.now().minusSeconds(5)),
                TokenRefresco.class);

        refrescar(sesion.refresco(), 401);
    }

    @Test
    void laRotacionConservaElLimiteAbsolutoDeLaSesion() throws Exception {
        Sesion sesion = registrar("limite@nutrivida.test");
        Instant limite = plantillaMongo.findAll(TokenRefresco.class).getFirst().sesionExpiraEn();

        refrescar(sesion.refresco(), 200);

        assertThat(plantillaMongo.findAll(TokenRefresco.class)).hasSize(2)
                .allSatisfy(token -> assertThat(token.sesionExpiraEn()).isEqualTo(limite));
    }

    @Test
    void cerrarSesionRevocaLaRenovacion() throws Exception {
        Sesion sesion = registrar("logout@nutrivida.test");

        mockMvc.perform(post("/api/autenticacion/cerrar-sesion").header("Authorization", "Bearer " + sesion.token())
                .cookie(new Cookie(COOKIE, sesion.refresco()))).andExpect(status().isNoContent());

        refrescar(sesion.refresco(), 401);
    }

    @Test
    void reutilizarUnRefrescoRotadoRevocaTodaLaFamilia() throws Exception {
        Sesion sesion = registrar("reuso@nutrivida.test");
        String vigente = valorCookie(refrescar(sesion.refresco(), 200));

        refrescar(sesion.refresco(), 401);
        refrescar(vigente, 401);
    }

    @Test
    void solicitudesSimultaneasConElMismoRefrescoSoloRenuevanUnaVez() throws Exception {
        Sesion sesion = registrar("simultaneo@nutrivida.test");
        ExecutorService ejecutor = Executors.newFixedThreadPool(6);
        List<Callable<Integer>> tareas = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            tareas.add(() -> mockMvc.perform(post("/api/autenticacion/refrescar").header(CABECERA, "1")
                    .cookie(new Cookie(COOKIE, sesion.refresco()))).andReturn().getResponse().getStatus());
        }
        List<Integer> estados = new ArrayList<>();
        for (Future<Integer> futuro : ejecutor.invokeAll(tareas)) {
            estados.add(futuro.get());
        }
        ejecutor.shutdown();

        assertThat(estados).filteredOn(estado -> estado == 200).hasSize(1);
        assertThat(estados).filteredOn(estado -> estado == 401).hasSize(5);
    }

    @Test
    void unUsuarioDesactivadoNoPuedeRenovarLaSesion() throws Exception {
        Sesion sesion = registrar("desactivado@nutrivida.test");
        mockMvc.perform(patch("/api/usuarios/" + sesion.usuarioId() + "/estado")
                        .header("Authorization", "Bearer " + tokenAdministrador())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk());

        refrescar(sesion.refresco(), 401);
    }

    @Test
    void elCambioDeRolInvalidaLasSesionesDeRenovacionVigentes() throws Exception {
        Sesion sesion = registrar("rol@nutrivida.test");
        mockMvc.perform(patch("/api/usuarios/" + sesion.usuarioId() + "/rol")
                        .header("Authorization", "Bearer " + tokenAdministrador())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"NUTRICIONISTA\"}"))
                .andExpect(status().isOk());

        refrescar(sesion.refresco(), 401);
        assertThat(plantillaMongo.count(Query.query(Criteria.where("revocado").is(true)), TokenRefresco.class))
                .isEqualTo(1);
    }

    @Test
    void unAccessTokenPreviamenteValidoDejaDeFuncionarTrasDesactivarAlUsuario() throws Exception {
        Sesion sesion = registrar("accesodesactivado@nutrivida.test");
        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + sesion.token()))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/usuarios/" + sesion.usuarioId() + "/estado")
                        .header("Authorization", "Bearer " + tokenAdministrador())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activo\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + sesion.token()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unAccessTokenConElRolAnteriorDejaDeFuncionarTrasCambiarElRol() throws Exception {
        Sesion sesion = registrar("accesorol@nutrivida.test");
        String administrador = tokenAdministrador();

        mockMvc.perform(patch("/api/usuarios/" + sesion.usuarioId() + "/rol").header("Authorization", "Bearer " + administrador)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"NUTRICIONISTA\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + sesion.token()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + administrador))
                .andExpect(status().isOk());
    }

    @Test
    void trasCambiarElRolUnNuevoInicioDeSesionEmiteUnTokenValidoConElRolNuevo() throws Exception {
        Sesion sesion = registrar("relogin@nutrivida.test");
        mockMvc.perform(patch("/api/usuarios/" + sesion.usuarioId() + "/rol")
                        .header("Authorization", "Bearer " + tokenAdministrador())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"NUTRICIONISTA\"}"))
                .andExpect(status().isOk());
        Thread.sleep(1100);

        MvcResult inicio = mockMvc.perform(post("/api/autenticacion/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                        .content(convertidorJson.writeValueAsString(Map.of("correo", "relogin@nutrivida.test", "contrasena", CONTRASENA))))
                .andExpect(status().isOk()).andReturn();
        JsonNode cuerpo = convertidorJson.readTree(inicio.getResponse().getContentAsString());

        assertThat(cuerpo.get("usuario").get("rol").asText()).isEqualTo("NUTRICIONISTA");
        mockMvc.perform(get("/api/autenticacion/yo").header("Authorization", "Bearer " + cuerpo.get("token").asText()))
                .andExpect(status().isOk());
    }
}
