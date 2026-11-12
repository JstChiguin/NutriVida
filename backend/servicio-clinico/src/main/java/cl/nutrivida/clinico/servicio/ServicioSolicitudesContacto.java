package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.SolicitudContactoNueva;
import cl.nutrivida.clinico.dto.SolicitudContactoRespuesta;
import cl.nutrivida.clinico.modelo.SolicitudContacto;
import cl.nutrivida.clinico.modelo.SolicitudContacto.EstadoSolicitud;
import cl.nutrivida.clinico.repositorio.RepositorioSolicitudesContacto;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;

@Service
public class ServicioSolicitudesContacto {

    private final RepositorioSolicitudesContacto repositorioSolicitudes;
    private final MongoTemplate plantillaMongo;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioSolicitudesContacto(RepositorioSolicitudesContacto repositorioSolicitudes, MongoTemplate plantillaMongo,
                                       ServicioAuditoria servicioAuditoria) {
        this.repositorioSolicitudes = repositorioSolicitudes;
        this.plantillaMongo = plantillaMongo;
        this.servicioAuditoria = servicioAuditoria;
    }

    public ResultadoRegistro registrarSolicitud(SolicitudContactoNueva solicitud) {
        String clave = calcularClaveDuplicado(solicitud);
        SolicitudContacto existente = repositorioSolicitudes.findByClaveDuplicado(clave).orElse(null);
        if (existente != null) {
            return new ResultadoRegistro(SolicitudContactoRespuesta.desde(existente), false);
        }
        Instant ahora = Instant.now();
        SolicitudContacto nueva = new SolicitudContacto(null, solicitud.nombre().trim(),
                solicitud.correo().trim().toLowerCase(), solicitud.telefono(), solicitud.mensaje().trim(),
                EstadoSolicitud.PENDIENTE, clave, ahora, ahora);
        try {
            return new ResultadoRegistro(SolicitudContactoRespuesta.desde(repositorioSolicitudes.save(nueva)), true);
        } catch (DuplicateKeyException excepcion) {
            SolicitudContacto concurrente = repositorioSolicitudes.findByClaveDuplicado(clave).orElseThrow();
            return new ResultadoRegistro(SolicitudContactoRespuesta.desde(concurrente), false);
        }
    }

    public PaginaRespuesta<SolicitudContactoRespuesta> listarSolicitudes(EstadoSolicitud estado, String texto,
                                                                          Pageable paginacion) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .textoEn(texto, "nombre", "correo", "mensaje")
                .igual("estado", estado);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, SolicitudContacto.class),
                SolicitudContactoRespuesta::desde);
    }

    public SolicitudContactoRespuesta cambiarEstado(String solicitudId, EstadoSolicitud nuevoEstado,
                                                    UsuarioAutenticado responsable) {
        SolicitudContacto existente = repositorioSolicitudes.findById(solicitudId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe la solicitud indicada"));
        SolicitudContacto guardada = repositorioSolicitudes.save(existente.conEstado(nuevoEstado));
        servicioAuditoria.registrar("solicitudes_contacto", solicitudId, "CAMBIAR_ESTADO_SOLICITUD", responsable,
                Map.of("estado", nuevoEstado.name()));
        return SolicitudContactoRespuesta.desde(guardada);
    }

    private String calcularClaveDuplicado(SolicitudContactoNueva solicitud) {
        String dia = LocalDate.now(ZoneOffset.UTC).toString();
        String texto = solicitud.correo().trim().toLowerCase() + "|" + solicitud.mensaje().trim().toLowerCase() + "|" + dia;
        try {
            byte[] resumen = MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumen);
        } catch (NoSuchAlgorithmException excepcion) {
            throw new IllegalStateException("SHA-256 no está disponible", excepcion);
        }
    }

    public record ResultadoRegistro(SolicitudContactoRespuesta solicitud, boolean creada) {
    }
}
