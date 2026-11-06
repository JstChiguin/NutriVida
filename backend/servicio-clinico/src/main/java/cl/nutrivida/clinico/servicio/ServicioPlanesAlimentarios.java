package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.PlanAlimentarioRespuesta;
import cl.nutrivida.clinico.dto.SolicitudPlanAlimentario;
import cl.nutrivida.clinico.modelo.PlanAlimentario;
import cl.nutrivida.clinico.modelo.PlanAlimentario.EstadoPlan;
import cl.nutrivida.clinico.repositorio.RepositorioPlanesAlimentarios;
import cl.nutrivida.clinico.servicio.ControlAcceso.ContextoClinico;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Service
public class ServicioPlanesAlimentarios {

    private final RepositorioPlanesAlimentarios repositorioPlanes;
    private final MongoTemplate plantillaMongo;
    private final ControlAcceso controlAcceso;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioPlanesAlimentarios(RepositorioPlanesAlimentarios repositorioPlanes, MongoTemplate plantillaMongo,
                                      ControlAcceso controlAcceso, ServicioAuditoria servicioAuditoria) {
        this.repositorioPlanes = repositorioPlanes;
        this.plantillaMongo = plantillaMongo;
        this.controlAcceso = controlAcceso;
        this.servicioAuditoria = servicioAuditoria;
    }

    public PlanAlimentarioRespuesta crearPlan(UsuarioAutenticado usuario, String pacienteId,
                                              SolicitudPlanAlimentario solicitud) {
        ContextoClinico contexto = controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        validarVigencia(solicitud);
        if (repositorioPlanes.findByPacienteIdAndEstado(pacienteId, EstadoPlan.VIGENTE).isPresent()) {
            throw new ConflictoDeNegocio("El paciente ya tiene un plan vigente; utilice la actualización para versionarlo");
        }
        int siguienteVersion = repositorioPlanes.findFirstByPacienteIdOrderByNumeroVersionDesc(pacienteId)
                .map(plan -> plan.numeroVersion() + 1).orElse(1);
        PlanAlimentario guardado = insertarPlan(construirPlan(contexto, solicitud, siguienteVersion, null));
        servicioAuditoria.registrar("planes_alimentarios", guardado.id(), "CREAR_PLAN", usuario,
                Map.of("pacienteId", pacienteId, "numeroVersion", guardado.numeroVersion()));
        return PlanAlimentarioRespuesta.desde(guardado);
    }

    public PlanAlimentarioRespuesta actualizarPlan(UsuarioAutenticado usuario, String planId,
                                                   SolicitudPlanAlimentario solicitud) {
        PlanAlimentario actual = buscarPlan(planId);
        ContextoClinico contexto = controlAcceso.validarAccesoClinicoDeEscritura(usuario, actual.pacienteId());
        validarVigencia(solicitud);
        PlanAlimentario reemplazado = cambiarEstado(planId, EstadoPlan.VIGENTE, EstadoPlan.REEMPLAZADO);
        try {
            PlanAlimentario nuevo = insertarPlan(
                    construirPlan(contexto, solicitud, reemplazado.numeroVersion() + 1, reemplazado.id()));
            servicioAuditoria.registrar("planes_alimentarios", nuevo.id(), "ACTUALIZAR_PLAN", usuario,
                    Map.of("planAnteriorId", planId, "numeroVersion", nuevo.numeroVersion()));
            return PlanAlimentarioRespuesta.desde(nuevo);
        } catch (RuntimeException excepcion) {
            cambiarEstado(planId, EstadoPlan.REEMPLAZADO, EstadoPlan.VIGENTE);
            throw excepcion;
        }
    }

    public PlanAlimentarioRespuesta finalizarPlan(UsuarioAutenticado usuario, String planId) {
        PlanAlimentario actual = buscarPlan(planId);
        controlAcceso.validarAccesoClinicoDeEscritura(usuario, actual.pacienteId());
        PlanAlimentario finalizado = cambiarEstado(planId, EstadoPlan.VIGENTE, EstadoPlan.FINALIZADO);
        servicioAuditoria.registrar("planes_alimentarios", planId, "FINALIZAR_PLAN", usuario, Map.of());
        return PlanAlimentarioRespuesta.desde(finalizado);
    }

    public PlanAlimentarioRespuesta consultarPlan(UsuarioAutenticado usuario, String planId) {
        PlanAlimentario plan = buscarPlan(planId);
        controlAcceso.validarAccesoClinicoDeLectura(usuario, plan.pacienteId());
        return PlanAlimentarioRespuesta.desde(plan);
    }

    public PlanAlimentarioRespuesta consultarPlanVigente(UsuarioAutenticado usuario, String pacienteId) {
        controlAcceso.validarAccesoClinicoDeLectura(usuario, pacienteId);
        return repositorioPlanes.findByPacienteIdAndEstado(pacienteId, EstadoPlan.VIGENTE)
                .map(PlanAlimentarioRespuesta::desde)
                .orElseThrow(() -> new RecursoNoEncontrado("El paciente no tiene un plan alimentario vigente"));
    }

    public PaginaRespuesta<PlanAlimentarioRespuesta> listarVersiones(UsuarioAutenticado usuario, String pacienteId,
                                                                      Pageable paginacion) {
        controlAcceso.validarAccesoClinicoDeLectura(usuario, pacienteId);
        ConstructorConsulta consulta = ConstructorConsulta.nuevo().igual("pacienteId", pacienteId);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, PlanAlimentario.class),
                PlanAlimentarioRespuesta::desde);
    }

    private PlanAlimentario construirPlan(ContextoClinico contexto, SolicitudPlanAlimentario solicitud, int numeroVersion,
                                          String planAnteriorId) {
        LocalDate desde = solicitud.vigenteDesde() == null ? LocalDate.now() : solicitud.vigenteDesde();
        String hasta = solicitud.vigenteHasta() == null ? null : solicitud.vigenteHasta().toString();
        return new PlanAlimentario(null, contexto.paciente().id(), contexto.nutricionista().id(), numeroVersion,
                EstadoPlan.VIGENTE, desde.toString(), hasta, solicitud.objetivos(), solicitud.comidas(),
                solicitud.recomendacionesGenerales(), planAnteriorId, Instant.now(), null);
    }

    private PlanAlimentario insertarPlan(PlanAlimentario plan) {
        try {
            return repositorioPlanes.save(plan);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("El plan fue modificado simultáneamente; vuelva a intentarlo");
        }
    }

    private PlanAlimentario cambiarEstado(String planId, EstadoPlan estadoEsperado, EstadoPlan estadoNuevo) {
        PlanAlimentario modificado = plantillaMongo.findAndModify(
                Query.query(Criteria.where("_id").is(planId).and("estado").is(estadoEsperado)),
                new Update().set("estado", estadoNuevo),
                FindAndModifyOptions.options().returnNew(true), PlanAlimentario.class);
        if (modificado == null) {
            throw new ConflictoDeNegocio("El plan ya no se encuentra en el estado esperado");
        }
        return modificado;
    }

    private PlanAlimentario buscarPlan(String planId) {
        return repositorioPlanes.findById(planId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe el plan alimentario solicitado"));
    }

    private void validarVigencia(SolicitudPlanAlimentario solicitud) {
        if (solicitud.vigenteDesde() != null && solicitud.vigenteHasta() != null
                && solicitud.vigenteHasta().isBefore(solicitud.vigenteDesde())) {
            throw new SolicitudInvalida("La fecha de término no puede ser anterior a la fecha de inicio");
        }
    }
}
