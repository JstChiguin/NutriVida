package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.ServicioRespuesta;
import cl.nutrivida.clinico.dto.SolicitudServicio;
import cl.nutrivida.clinico.modelo.ServicioNutricional;
import cl.nutrivida.clinico.repositorio.RepositorioServicios;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class ServicioCatalogo {

    private static final int BLOQUE_MINUTOS = 15;

    private final RepositorioServicios repositorioServicios;
    private final MongoTemplate plantillaMongo;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioCatalogo(RepositorioServicios repositorioServicios, MongoTemplate plantillaMongo,
                            ServicioAuditoria servicioAuditoria) {
        this.repositorioServicios = repositorioServicios;
        this.plantillaMongo = plantillaMongo;
        this.servicioAuditoria = servicioAuditoria;
    }

    public PaginaRespuesta<ServicioRespuesta> listarServicios(String texto, String categoria, boolean soloActivos,
                                                              Pageable paginacion) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .textoEn(texto, "nombre", "descripcion")
                .igual("categoria", categoria)
                .igual("activo", soloActivos ? Boolean.TRUE : null);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, ServicioNutricional.class),
                ServicioRespuesta::desde);
    }

    public ServicioRespuesta consultarServicio(String servicioId) {
        return ServicioRespuesta.desde(buscar(servicioId));
    }

    public ServicioRespuesta crearServicio(SolicitudServicio solicitud, UsuarioAutenticado responsable) {
        validarDuracion(solicitud.duracionMinutos());
        if (repositorioServicios.existsByNombreIgnoreCase(solicitud.nombre().trim())) {
            throw new ConflictoDeNegocio("Ya existe un servicio con ese nombre");
        }
        Instant ahora = Instant.now();
        ServicioNutricional nuevo = new ServicioNutricional(null, solicitud.nombre().trim(), solicitud.descripcion(),
                solicitud.categoria(), solicitud.duracionMinutos(), solicitud.precioReferencial(), true, ahora, ahora,
                null);
        ServicioNutricional guardado = guardar(nuevo);
        servicioAuditoria.registrar("servicios", guardado.id(), "CREAR_SERVICIO", responsable, Map.of());
        return ServicioRespuesta.desde(guardado);
    }

    public ServicioRespuesta actualizarServicio(String servicioId, SolicitudServicio solicitud,
                                                UsuarioAutenticado responsable) {
        validarDuracion(solicitud.duracionMinutos());
        ServicioNutricional guardado = guardar(buscar(servicioId).conDatos(solicitud.nombre().trim(),
                solicitud.descripcion(), solicitud.categoria(), solicitud.duracionMinutos(),
                solicitud.precioReferencial()));
        servicioAuditoria.registrar("servicios", servicioId, "ACTUALIZAR_SERVICIO", responsable, Map.of());
        return ServicioRespuesta.desde(guardado);
    }

    public ServicioRespuesta cambiarEstado(String servicioId, boolean activo, UsuarioAutenticado responsable) {
        ServicioNutricional guardado = guardar(buscar(servicioId).conEstado(activo));
        servicioAuditoria.registrar("servicios", servicioId, activo ? "ACTIVAR_SERVICIO" : "DESACTIVAR_SERVICIO",
                responsable, Map.of());
        return ServicioRespuesta.desde(guardado);
    }

    private void validarDuracion(int duracionMinutos) {
        if (duracionMinutos % BLOQUE_MINUTOS != 0) {
            throw new SolicitudInvalida("La duración debe ser múltiplo de " + BLOQUE_MINUTOS + " minutos");
        }
    }

    private ServicioNutricional buscar(String servicioId) {
        return repositorioServicios.findById(servicioId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe el servicio solicitado"));
    }

    private ServicioNutricional guardar(ServicioNutricional servicio) {
        try {
            return repositorioServicios.save(servicio);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("Ya existe un servicio con ese nombre");
        }
    }
}
