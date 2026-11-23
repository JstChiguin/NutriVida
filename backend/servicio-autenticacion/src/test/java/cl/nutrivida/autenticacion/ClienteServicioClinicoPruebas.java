package cl.nutrivida.autenticacion;

import cl.nutrivida.autenticacion.dto.SolicitudPerfilPaciente;
import cl.nutrivida.autenticacion.servicio.ClienteServicioClinico;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.ServicioNoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ClienteServicioClinicoPruebas {

    private static final String URL_BASE = "http://clinico.prueba";
    private static final String RUTA = URL_BASE + "/api/v1/internos/pacientes";

    private MockRestServiceServer servidor;
    private ClienteServicioClinico cliente;

    private final SolicitudPerfilPaciente solicitud = new SolicitudPerfilPaciente(
            "usuario-ficticio", "Paciente Ficticia", "ficticia@nutrivida.test", "12345678-5", "56912345678",
            LocalDate.of(1990, 1, 15));

    @BeforeEach
    void prepararCliente() {
        RestClient.Builder constructor = RestClient.builder().baseUrl(URL_BASE);
        servidor = MockRestServiceServer.bindTo(constructor).build();
        ServicioTokens servicioTokens = Mockito.mock(ServicioTokens.class);
        Mockito.when(servicioTokens.generar(any(), any(), eq(Rol.SERVICIO_INTERNO), any(Duration.class)))
                .thenReturn("token-ficticio");
        cliente = new ClienteServicioClinico(constructor.build(), servicioTokens);
    }

    @Test
    void enviaElPerfilConElTokenInternoAlEndpointInterno() {
        servidor.expect(requestTo(RUTA))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer token-ficticio"))
                .andRespond(withStatus(HttpStatus.CREATED));

        cliente.crearPerfilPaciente(solicitud);

        servidor.verify();
    }

    @Test
    void traduceElConflictoDeRutDelClinicoAConflictoDeNegocioConSuMensaje() {
        servidor.expect(requestTo(RUTA)).andRespond(withStatus(HttpStatus.CONFLICT)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"estado\":409,\"codigo\":\"CONFLICTO_DE_NEGOCIO\",\"mensaje\":\"Ya existe un paciente registrado con ese RUT\"}"));

        assertThatThrownBy(() -> cliente.crearPerfilPaciente(solicitud))
                .isInstanceOf(ConflictoDeNegocio.class)
                .hasMessage("Ya existe un paciente registrado con ese RUT");
    }

    @Test
    void usaUnMensajeGenericoSiElConflictoLlegaSinCuerpoUtil() {
        servidor.expect(requestTo(RUTA)).andRespond(withStatus(HttpStatus.CONFLICT));

        assertThatThrownBy(() -> cliente.crearPerfilPaciente(solicitud))
                .isInstanceOf(ConflictoDeNegocio.class)
                .hasMessage("Ya existe un paciente registrado con esos datos");
    }

    @Test
    void usaUnMensajeGenericoSiElConflictoLlegaConCuerpoNoJson() {
        servidor.expect(requestTo(RUTA)).andRespond(withStatus(HttpStatus.CONFLICT)
                .contentType(MediaType.TEXT_PLAIN).body("conflicto"));

        assertThatThrownBy(() -> cliente.crearPerfilPaciente(solicitud))
                .isInstanceOf(ConflictoDeNegocio.class)
                .hasMessage("Ya existe un paciente registrado con esos datos");
    }

    @Test
    void conservaElServicioNoDisponibleParaErroresDelServidorClinico() {
        for (HttpStatus estado : new HttpStatus[]{HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.BAD_GATEWAY,
                HttpStatus.SERVICE_UNAVAILABLE, HttpStatus.GATEWAY_TIMEOUT}) {
            servidor.reset();
            servidor.expect(requestTo(RUTA)).andRespond(withStatus(estado));

            assertThatThrownBy(() -> cliente.crearPerfilPaciente(solicitud))
                    .as("estado %s", estado.value())
                    .isInstanceOf(ServicioNoDisponible.class);
        }
    }

    @Test
    void conservaElServicioNoDisponibleParaRechazosDeAutorizacionInterna() {
        for (HttpStatus estado : new HttpStatus[]{HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.BAD_REQUEST}) {
            servidor.reset();
            servidor.expect(requestTo(RUTA)).andRespond(withStatus(estado));

            assertThatThrownBy(() -> cliente.crearPerfilPaciente(solicitud))
                    .as("estado %s", estado.value())
                    .isInstanceOf(ServicioNoDisponible.class);
        }
    }

    @Test
    void conservaElServicioNoDisponibleCuandoSeCaeLaConexion() {
        servidor.expect(requestTo(RUTA)).andRespond(withException(new IOException("conexión rechazada")));

        assertThatThrownBy(() -> cliente.crearPerfilPaciente(solicitud))
                .isInstanceOf(ServicioNoDisponible.class)
                .hasMessage("No fue posible crear el perfil clínico del paciente");
    }

    @Test
    void conservaElServicioNoDisponibleConUnClinicoRealmenteInalcanzable() {
        ServicioTokens servicioTokens = Mockito.mock(ServicioTokens.class);
        Mockito.when(servicioTokens.generar(any(), any(), any(), any(Duration.class))).thenReturn("token-ficticio");
        ClienteServicioClinico inalcanzable = new ClienteServicioClinico(
                RestClient.builder().baseUrl("http://127.0.0.1:1").build(), servicioTokens);

        assertThatThrownBy(() -> inalcanzable.crearPerfilPaciente(solicitud))
                .isInstanceOf(ServicioNoDisponible.class);
    }

    @Test
    void unaRespuestaExitosaNoLanzaExcepciones() {
        servidor.expect(requestTo(RUTA)).andRespond(withSuccess());

        cliente.crearPerfilPaciente(solicitud);

        servidor.verify();
    }
}
