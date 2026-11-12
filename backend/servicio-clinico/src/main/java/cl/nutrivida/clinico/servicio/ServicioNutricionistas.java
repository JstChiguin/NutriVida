package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.NutricionistaRespuesta;
import cl.nutrivida.clinico.dto.SolicitudNutricionista;
import cl.nutrivida.clinico.modelo.Nutricionista;
import cl.nutrivida.clinico.repositorio.RepositorioNutricionistas;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ServicioNutricionistas {

    private final RepositorioNutricionistas repositorioNutricionistas;
    private final RepositorioServicios repositorioServicios;
    private final MongoTemplate plantillaMongo;
    private final ControlAcceso controlAcceso;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioNutricionistas(RepositorioNutricionistas repositorioNutricionistas,
                                  RepositorioServicios repositorioServicios, MongoTemplate plantillaMongo,
                                  ControlAcceso controlAcceso, ServicioAuditoria servicioAuditoria) {
        this.repositorioNutricionistas = repositorioNutricionistas;
        this.repositorioServicios = repositorioServicios;
        this.plantillaMongo = plantillaMongo;
        this.controlAcceso = controlAcceso;
        this.servicioAuditoria = servicioAuditoria;
    }

    public PaginaRespuesta<NutricionistaRespuesta> listarNutricionistas(String texto, String especialidad,
                                                                         String servicioId, boolean soloActivos,
                                                                         Pageable paginacion) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .textoEn(texto, "nombreCompleto", "especialidades")
                .igual("activo", soloActivos ? Boolean.TRUE : null)
                .contiene("especialidades", especialidad)
                .contiene("serviciosIds", servicioId);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, Nutricionista.class),
                NutricionistaRespuesta::desde);
    }

    public NutricionistaRespuesta consultarNutricionista(String nutricionistaId) {
        return NutricionistaRespuesta.desde(buscar(nutricionistaId));
    }

    public NutricionistaRespuesta consultarMiPerfil(UsuarioAutenticado usuario) {
        return NutricionistaRespuesta.desde(controlAcceso.obtenerNutricionistaDelUsuario(usuario));
    }

    public NutricionistaRespuesta crearNutricionista(SolicitudNutricionista solicitud, UsuarioAutenticado responsable) {
        if (solicitud.usuarioId() == null || solicitud.usuarioId().isBlank()) {
            throw new SolicitudInvalida("Debe indicar el usuario asociado al nutricionista");
        }
        List<String> servicios = validarServicios(solicitud.serviciosIds());
        Instant ahora = Instant.now();
        Nutricionista nuevo = new Nutricionista(null, solicitud.usuarioId(), solicitud.nombreCompleto().trim(),
                solicitud.titulo(), solicitud.especialidades(), solicitud.biografia(), solicitud.fotoUrl(), servicios,
                true, ahora, ahora, null);
        Nutricionista guardado = guardar(nuevo);
        servicioAuditoria.registrar("nutricionistas", guardado.id(), "CREAR_NUTRICIONISTA", responsable, Map.of());
        return NutricionistaRespuesta.desde(guardado);
    }

    public NutricionistaRespuesta actualizarNutricionista(String nutricionistaId, SolicitudNutricionista solicitud,
                                                          UsuarioAutenticado responsable) {
        Nutricionista existente = buscar(nutricionistaId);
        return actualizarPerfil(existente, solicitud, responsable);
    }

    public NutricionistaRespuesta actualizarMiPerfil(UsuarioAutenticado usuario, SolicitudNutricionista solicitud) {
        Nutricionista existente = controlAcceso.obtenerNutricionistaDelUsuario(usuario);
        return actualizarPerfil(existente, solicitud, usuario);
    }

    public NutricionistaRespuesta cambiarEstado(String nutricionistaId, boolean activo, UsuarioAutenticado responsable) {
        Nutricionista guardado = guardar(buscar(nutricionistaId).conEstado(activo));
        servicioAuditoria.registrar("nutricionistas", nutricionistaId,
                activo ? "ACTIVAR_NUTRICIONISTA" : "DESACTIVAR_NUTRICIONISTA", responsable, Map.of());
        return NutricionistaRespuesta.desde(guardado);
    }

    private NutricionistaRespuesta actualizarPerfil(Nutricionista existente, SolicitudNutricionista solicitud,
                                                    UsuarioAutenticado responsable) {
        List<String> servicios = validarServicios(solicitud.serviciosIds());
        Nutricionista guardado = guardar(existente.conPerfil(solicitud.nombreCompleto().trim(), solicitud.titulo(),
                solicitud.especialidades(), solicitud.biografia(), solicitud.fotoUrl(), servicios));
        servicioAuditoria.registrar("nutricionistas", existente.id(), "ACTUALIZAR_NUTRICIONISTA", responsable, Map.of());
        return NutricionistaRespuesta.desde(guardado);
    }

    private List<String> validarServicios(List<String> serviciosIds) {
        List<String> identificadores = serviciosIds == null ? new ArrayList<>() : serviciosIds;
        for (String servicioId : identificadores) {
            if (!repositorioServicios.existsById(servicioId)) {
                throw new SolicitudInvalida("El servicio " + servicioId + " no existe");
            }
        }
        return identificadores;
    }

    private Nutricionista buscar(String nutricionistaId) {
        return repositorioNutricionistas.findById(nutricionistaId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe el nutricionista solicitado"));
    }

    private Nutricionista guardar(Nutricionista nutricionista) {
        try {
            return repositorioNutricionistas.save(nutricionista);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("El usuario ya tiene un perfil de nutricionista");
        }
    }
}
