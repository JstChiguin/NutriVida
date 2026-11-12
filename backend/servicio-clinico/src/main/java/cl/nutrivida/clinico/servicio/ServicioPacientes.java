package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.PacienteRespuesta;
import cl.nutrivida.clinico.dto.SolicitudActualizarPaciente;
import cl.nutrivida.clinico.dto.SolicitudPerfilPaciente;
import cl.nutrivida.clinico.modelo.Nutricionista;
import cl.nutrivida.clinico.modelo.Paciente;
import cl.nutrivida.clinico.repositorio.RepositorioNutricionistas;
import cl.nutrivida.clinico.repositorio.RepositorioPacientes;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;

@Service
public class ServicioPacientes {

    private final RepositorioPacientes repositorioPacientes;
    private final RepositorioNutricionistas repositorioNutricionistas;
    private final MongoTemplate plantillaMongo;
    private final ControlAcceso controlAcceso;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioPacientes(RepositorioPacientes repositorioPacientes, RepositorioNutricionistas repositorioNutricionistas,
                             MongoTemplate plantillaMongo, ControlAcceso controlAcceso,
                             ServicioAuditoria servicioAuditoria) {
        this.repositorioPacientes = repositorioPacientes;
        this.repositorioNutricionistas = repositorioNutricionistas;
        this.plantillaMongo = plantillaMongo;
        this.controlAcceso = controlAcceso;
        this.servicioAuditoria = servicioAuditoria;
    }

    public PacienteRespuesta crearPerfilDesdeRegistro(SolicitudPerfilPaciente solicitud) {
        Paciente existente = repositorioPacientes.findByUsuarioId(solicitud.usuarioId()).orElse(null);
        if (existente != null) {
            return PacienteRespuesta.desde(existente);
        }
        if (solicitud.rut() != null && repositorioPacientes.existsByRut(normalizarRut(solicitud.rut()))) {
            throw new ConflictoDeNegocio("Ya existe un paciente registrado con ese RUT");
        }
        Instant ahora = Instant.now();
        Paciente nuevo = new Paciente(null, solicitud.usuarioId(), solicitud.nombreCompleto().trim(),
                normalizarRut(solicitud.rut()), solicitud.correo(), solicitud.telefono(),
                solicitud.fechaNacimiento() == null ? null : solicitud.fechaNacimiento().toString(), null, null, true,
                new ArrayList<>(), ahora, ahora, null);
        Paciente guardado = guardar(nuevo);
        servicioAuditoria.registrar("pacientes", guardado.id(), "CREAR_PACIENTE", null, Map.of());
        return PacienteRespuesta.desde(guardado);
    }

    public PacienteRespuesta obtenerMiPerfil(UsuarioAutenticado usuario) {
        return PacienteRespuesta.desde(controlAcceso.obtenerPacienteDelUsuario(usuario));
    }

    public PacienteRespuesta actualizarMiPerfil(UsuarioAutenticado usuario, SolicitudActualizarPaciente solicitud) {
        Paciente paciente = controlAcceso.obtenerPacienteDelUsuario(usuario);
        return actualizarDatos(paciente, solicitud, usuario);
    }

    public PaginaRespuesta<PacienteRespuesta> listarPacientes(UsuarioAutenticado usuario, String texto, Boolean activo,
                                                              Pageable paginacion) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .textoEn(texto, "nombreCompleto", "correo", "rut")
                .igual("activo", activo);
        if (usuario.esNutricionista()) {
            Nutricionista nutricionista = controlAcceso.obtenerNutricionistaDelUsuario(usuario);
            consulta.condicion(Criteria.where("nutricionistasAutorizados").in(nutricionista.id()));
        }
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, Paciente.class), PacienteRespuesta::desde);
    }

    public PacienteRespuesta consultarPaciente(UsuarioAutenticado usuario, String pacienteId) {
        return PacienteRespuesta.desde(controlAcceso.validarAccesoAPerfilDePaciente(usuario, pacienteId));
    }

    public PacienteRespuesta actualizarPaciente(UsuarioAutenticado usuario, String pacienteId,
                                                SolicitudActualizarPaciente solicitud) {
        return actualizarDatos(controlAcceso.buscarPaciente(pacienteId), solicitud, usuario);
    }

    public PacienteRespuesta cambiarEstado(UsuarioAutenticado usuario, String pacienteId, boolean activo) {
        Paciente guardado = guardar(controlAcceso.buscarPaciente(pacienteId).conEstado(activo));
        servicioAuditoria.registrar("pacientes", pacienteId, activo ? "ACTIVAR_PACIENTE" : "DESACTIVAR_PACIENTE",
                usuario, Map.of());
        return PacienteRespuesta.desde(guardado);
    }

    public PacienteRespuesta autorizarNutricionista(UsuarioAutenticado responsable, String pacienteId,
                                                    String nutricionistaId) {
        repositorioNutricionistas.findById(nutricionistaId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe el nutricionista indicado"));
        controlAcceso.buscarPaciente(pacienteId);
        plantillaMongo.updateFirst(
                org.springframework.data.mongodb.core.query.Query.query(Criteria.where("_id").is(pacienteId)),
                new org.springframework.data.mongodb.core.query.Update().addToSet("nutricionistasAutorizados", nutricionistaId),
                Paciente.class);
        servicioAuditoria.registrar("pacientes", pacienteId, "AUTORIZAR_NUTRICIONISTA", responsable,
                Map.of("nutricionistaId", nutricionistaId));
        return PacienteRespuesta.desde(controlAcceso.buscarPaciente(pacienteId));
    }

    public PacienteRespuesta retirarAutorizacion(UsuarioAutenticado responsable, String pacienteId, String nutricionistaId) {
        controlAcceso.buscarPaciente(pacienteId);
        plantillaMongo.updateFirst(
                org.springframework.data.mongodb.core.query.Query.query(Criteria.where("_id").is(pacienteId)),
                new org.springframework.data.mongodb.core.query.Update().pull("nutricionistasAutorizados", nutricionistaId),
                Paciente.class);
        servicioAuditoria.registrar("pacientes", pacienteId, "RETIRAR_AUTORIZACION_NUTRICIONISTA", responsable,
                Map.of("nutricionistaId", nutricionistaId));
        return PacienteRespuesta.desde(controlAcceso.buscarPaciente(pacienteId));
    }

    private PacienteRespuesta actualizarDatos(Paciente paciente, SolicitudActualizarPaciente solicitud,
                                              UsuarioAutenticado responsable) {
        String rutNormalizado = normalizarRut(solicitud.rut());
        boolean rutCambia = rutNormalizado != null && !rutNormalizado.equals(paciente.rut());
        if (rutCambia && repositorioPacientes.existsByRut(rutNormalizado)) {
            throw new ConflictoDeNegocio("Ya existe un paciente registrado con ese RUT");
        }
        String fechaNacimiento = solicitud.fechaNacimiento() == null ? null : solicitud.fechaNacimiento().toString();
        Paciente actualizado = guardar(paciente.conDatosPersonales(solicitud.nombreCompleto().trim(), rutNormalizado,
                solicitud.telefono(), fechaNacimiento, solicitud.sexo(), solicitud.direccion()));
        servicioAuditoria.registrar("pacientes", paciente.id(), "ACTUALIZAR_PACIENTE", responsable, Map.of());
        return PacienteRespuesta.desde(actualizado);
    }

    private Paciente guardar(Paciente paciente) {
        try {
            return repositorioPacientes.save(paciente);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("Ya existe un paciente con el mismo usuario o RUT");
        }
    }

    private String normalizarRut(String rut) {
        return rut == null || rut.isBlank() ? null : rut.trim().toUpperCase();
    }
}
