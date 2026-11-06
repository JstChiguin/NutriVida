package cl.nutrivida.agenda.clinico;

import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.ServicioNoDisponible;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.function.Supplier;

@Component
public class ClienteClinicoRest implements ClienteClinico {

    private static final Duration VIGENCIA_TOKEN_INTERNO = Duration.ofMinutes(1);

    private final RestClient clienteRest;
    private final ServicioTokens servicioTokens;

    public ClienteClinicoRest(RestClient clienteRestClinico, ServicioTokens servicioTokens) {
        this.clienteRest = clienteRestClinico;
        this.servicioTokens = servicioTokens;
    }

    @Override
    public ResumenPaciente consultarMiPerfilDePaciente() {
        return pedirConSesion("/api/pacientes/yo", ResumenPaciente.class);
    }

    @Override
    public ResumenPaciente consultarPaciente(String pacienteId) {
        return pedirConSesion("/api/pacientes/" + pacienteId, ResumenPaciente.class);
    }

    @Override
    public ResumenNutricionista consultarMiPerfilDeNutricionista() {
        return pedirConSesion("/api/nutricionistas/yo", ResumenNutricionista.class);
    }

    @Override
    public ResumenNutricionista consultarNutricionista(String nutricionistaId) {
        return ejecutar(() -> clienteRest.get().uri("/api/nutricionistas/{id}", nutricionistaId)
                .retrieve().body(ResumenNutricionista.class));
    }

    @Override
    public ResumenServicio consultarServicio(String servicioId) {
        return ejecutar(() -> clienteRest.get().uri("/api/servicios/{id}", servicioId)
                .retrieve().body(ResumenServicio.class));
    }

    @Override
    public void autorizarNutricionistaSobrePaciente(String pacienteId, String nutricionistaId) {
        String tokenInterno = servicioTokens.generar("servicio-agenda", "interno@nutrivida.local",
                Rol.SERVICIO_INTERNO, VIGENCIA_TOKEN_INTERNO);
        ejecutar(() -> clienteRest.post()
                .uri("/api/internos/pacientes/{p}/nutricionistas/{n}/autorizacion", pacienteId, nutricionistaId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInterno)
                .retrieve().toBodilessEntity());
    }

    private <T> T pedirConSesion(String ruta, Class<T> tipo) {
        String token = UsuarioActual.obtenerTokenActual();
        return ejecutar(() -> clienteRest.get().uri(ruta)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve().body(tipo));
    }

    private <T> T ejecutar(Supplier<T> llamada) {
        try {
            return llamada.get();
        } catch (org.springframework.web.client.HttpClientErrorException excepcion) {
            HttpStatusCode estado = excepcion.getStatusCode();
            if (estado.value() == 404) {
                throw new RecursoNoEncontrado("El recurso solicitado no existe en el servicio clínico");
            }
            if (estado.value() == 403 || estado.value() == 401) {
                throw new PermisoDenegado("El servicio clínico denegó el acceso al recurso");
            }
            throw new ServicioNoDisponible("El servicio clínico rechazó la solicitud");
        } catch (RestClientException excepcion) {
            throw new ServicioNoDisponible("No fue posible comunicarse con el servicio clínico");
        }
    }
}
