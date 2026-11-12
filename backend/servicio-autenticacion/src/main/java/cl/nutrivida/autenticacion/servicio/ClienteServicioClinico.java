package cl.nutrivida.autenticacion.servicio;

import cl.nutrivida.autenticacion.dto.SolicitudPerfilPaciente;
import cl.nutrivida.comun.excepciones.ServicioNoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

@Component
public class ClienteServicioClinico {

    private static final Duration VIGENCIA_TOKEN_INTERNO = Duration.ofMinutes(1);

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
                    .uri("/api/internos/pacientes")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInterno)
                    .body(solicitud)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException excepcion) {
            throw new ServicioNoDisponible("No fue posible crear el perfil clínico del paciente");
        }
    }
}
