package cl.nutrivida.autenticacion.servicio;

import cl.nutrivida.autenticacion.dto.SolicitudPerfilPaciente;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.ServicioNoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;

@Component
public class ClienteServicioClinico {

    private static final Duration VIGENCIA_TOKEN_INTERNO = Duration.ofMinutes(1);
    private static final String MENSAJE_CONFLICTO = "Ya existe un paciente registrado con esos datos";

    private final RestClient clienteRest;
    private final ServicioTokens servicioTokens;

    public ClienteServicioClinico(RestClient clienteRestClinico, ServicioTokens servicioTokens) {
        this.clienteRest = clienteRestClinico;
        this.servicioTokens = servicioTokens;
    }

    public void crearPerfilPaciente(SolicitudPerfilPaciente solicitud) {
        String tokenInterno = servicioTokens.generar("servicio-autenticacion", "interno@nutrivida.local",
                Rol.SERVICIO_INTERNO, VIGENCIA_TOKEN_INTERNO);
        try {
            clienteRest.post()
                    .uri("/api/v1/internos/pacientes")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInterno)
                    .body(solicitud)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.Conflict excepcion) {
            throw new ConflictoDeNegocio(extraerMensajeDeConflicto(excepcion));
        } catch (RestClientException excepcion) {
            throw new ServicioNoDisponible("No fue posible crear el perfil clínico del paciente");
        }
    }

    private String extraerMensajeDeConflicto(HttpClientErrorException excepcion) {
        try {
            Map<?, ?> cuerpo = excepcion.getResponseBodyAs(Map.class);
            if (cuerpo != null && cuerpo.get("mensaje") instanceof String mensaje && !mensaje.isBlank()) {
                return mensaje;
            }
        } catch (RuntimeException ignorada) {
            return MENSAJE_CONFLICTO;
        }
        return MENSAJE_CONFLICTO;
    }
}
