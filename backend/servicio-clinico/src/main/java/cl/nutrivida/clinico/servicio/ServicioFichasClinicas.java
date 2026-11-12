package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.DatosFichaClinica;
import cl.nutrivida.clinico.dto.FichaClinicaRespuesta;
import cl.nutrivida.clinico.dto.SolicitudActualizarFicha;
import cl.nutrivida.clinico.dto.SolicitudCorreccionEvolucion;
import cl.nutrivida.clinico.dto.SolicitudEvolucion;
import cl.nutrivida.clinico.modelo.FichaClinica;
import cl.nutrivida.clinico.modelo.FichaClinica.CorreccionFicha;
import cl.nutrivida.clinico.modelo.FichaClinica.EstadoFicha;
import cl.nutrivida.clinico.modelo.FichaClinica.Evolucion;
import cl.nutrivida.clinico.repositorio.RepositorioFichasClinicas;
import cl.nutrivida.clinico.servicio.ControlAcceso.ContextoClinico;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class ServicioFichasClinicas {

    private final RepositorioFichasClinicas repositorioFichas;
    private final MongoTemplate plantillaMongo;
    private final ControlAcceso controlAcceso;
    private final ServicioAuditoria servicioAuditoria;
    private final ObjectMapper convertidorJson;

    public ServicioFichasClinicas(RepositorioFichasClinicas repositorioFichas, MongoTemplate plantillaMongo,
                                  ControlAcceso controlAcceso, ServicioAuditoria servicioAuditoria,
                                  ObjectMapper convertidorJson) {
        this.repositorioFichas = repositorioFichas;
        this.plantillaMongo = plantillaMongo;
        this.controlAcceso = controlAcceso;
        this.servicioAuditoria = servicioAuditoria;
        this.convertidorJson = convertidorJson;
    }

    public FichaClinicaRespuesta abrirFicha(UsuarioAutenticado usuario, String pacienteId, DatosFichaClinica datos) {
        ContextoClinico contexto = controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        FichaClinica nueva = construirFicha(contexto, datos);
        try {
            FichaClinica guardada = repositorioFichas.save(nueva);
            servicioAuditoria.registrar("fichas_clinicas", guardada.id(), "ABRIR_FICHA", usuario,
                    Map.of("pacienteId", pacienteId));
            return FichaClinicaRespuesta.desde(guardada);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("El paciente ya tiene una ficha clínica abierta");
        }
    }

    public FichaClinicaRespuesta consultarFicha(UsuarioAutenticado usuario, String pacienteId) {
        controlAcceso.validarAccesoClinicoDeLectura(usuario, pacienteId);
        return FichaClinicaRespuesta.desde(buscarFicha(pacienteId));
    }

    public FichaClinicaRespuesta actualizarFicha(UsuarioAutenticado usuario, String pacienteId,
                                                 SolicitudActualizarFicha solicitud) {
        controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        FichaClinica existente = buscarFicha(pacienteId);
        exigirFichaAbierta(existente);
        CorreccionFicha correccion = new CorreccionFicha(Instant.now(), usuario.usuarioId(), solicitud.motivoCambio(),
                serializarDatos(existente));
        DatosFichaClinica datos = solicitud.datos();
        FichaClinica actualizada = repositorioFichas.save(new FichaClinica(existente.id(), existente.pacienteId(),
                existente.nutricionistaResponsableId(), existente.fechaApertura(), datos.motivoConsulta(),
                datos.antecedentes(), datos.alergias(), datos.intolerancias(), datos.habitosAlimentarios(),
                datos.actividadFisica(), datos.objetivosNutricionales(), datos.evaluacion(),
                datos.diagnosticoNutricional(), datos.planIntervencion(), datos.indicaciones(), existente.estado(),
                existente.evoluciones(), agregarCorreccion(existente, correccion), Instant.now(), existente.version()));
        servicioAuditoria.registrar("fichas_clinicas", existente.id(), "ACTUALIZAR_FICHA", usuario,
                Map.of("motivo", solicitud.motivoCambio()));
        return FichaClinicaRespuesta.desde(actualizada);
    }

    public FichaClinicaRespuesta registrarEvolucion(UsuarioAutenticado usuario, String pacienteId,
                                                    SolicitudEvolucion solicitud) {
        ContextoClinico contexto = controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        FichaClinica ficha = buscarFicha(pacienteId);
        exigirFichaAbierta(ficha);
        Evolucion evolucion = new Evolucion(UUID.randomUUID().toString(), Instant.now(), contexto.nutricionista().id(),
                solicitud.citaId(), solicitud.descripcion(), solicitud.indicaciones(), null, null, false);
        agregarEvolucion(ficha.id(), evolucion);
        servicioAuditoria.registrar("fichas_clinicas", ficha.id(), "REGISTRAR_EVOLUCION", usuario,
                Map.of("evolucionId", evolucion.identificador()));
        return FichaClinicaRespuesta.desde(buscarFicha(pacienteId));
    }

    public FichaClinicaRespuesta corregirEvolucion(UsuarioAutenticado usuario, String pacienteId, String evolucionId,
                                                   SolicitudCorreccionEvolucion solicitud) {
        ContextoClinico contexto = controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        FichaClinica ficha = buscarFicha(pacienteId);
        exigirFichaAbierta(ficha);
        Evolucion original = ficha.evoluciones().stream()
                .filter(evolucion -> evolucion.identificador().equals(evolucionId))
                .findFirst()
                .orElseThrow(() -> new RecursoNoEncontrado("No existe la evolución indicada"));
        if (!original.nutricionistaId().equals(contexto.nutricionista().id())) {
            throw new PermisoDenegado("Solo el profesional que registró la evolución puede corregirla");
        }
        if (original.corregida()) {
            throw new ConflictoDeNegocio("La evolución ya fue corregida anteriormente");
        }
        Evolucion correccion = new Evolucion(UUID.randomUUID().toString(), Instant.now(), original.nutricionistaId(),
                original.citaId(), solicitud.descripcion(), solicitud.indicaciones(), original.identificador(),
                solicitud.motivoCorreccion(), false);
        marcarComoCorregida(ficha.id(), original.identificador());
        agregarEvolucion(ficha.id(), correccion);
        servicioAuditoria.registrar("fichas_clinicas", ficha.id(), "CORREGIR_EVOLUCION", usuario,
                Map.of("evolucionOriginalId", original.identificador(), "evolucionNuevaId", correccion.identificador(),
                        "motivo", solicitud.motivoCorreccion()));
        return FichaClinicaRespuesta.desde(buscarFicha(pacienteId));
    }

    public FichaClinicaRespuesta cambiarEstado(UsuarioAutenticado usuario, String pacienteId, EstadoFicha nuevoEstado) {
        controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        FichaClinica ficha = buscarFicha(pacienteId);
        plantillaMongo.updateFirst(Query.query(Criteria.where("_id").is(ficha.id())),
                new Update().set("estado", nuevoEstado).set("actualizadoEn", Instant.now()), FichaClinica.class);
        servicioAuditoria.registrar("fichas_clinicas", ficha.id(), "CAMBIAR_ESTADO_FICHA", usuario,
                Map.of("estado", nuevoEstado.name()));
        return FichaClinicaRespuesta.desde(buscarFicha(pacienteId));
    }

    private FichaClinica construirFicha(ContextoClinico contexto, DatosFichaClinica datos) {
        Instant ahora = Instant.now();
        return new FichaClinica(null, contexto.paciente().id(), contexto.nutricionista().id(), ahora,
                datos.motivoConsulta(), datos.antecedentes(), datos.alergias(), datos.intolerancias(),
                datos.habitosAlimentarios(), datos.actividadFisica(), datos.objetivosNutricionales(), datos.evaluacion(),
                datos.diagnosticoNutricional(), datos.planIntervencion(), datos.indicaciones(), EstadoFicha.ABIERTA,
                null, null, ahora, null);
    }

    private void agregarEvolucion(String fichaId, Evolucion evolucion) {
        plantillaMongo.updateFirst(Query.query(Criteria.where("_id").is(fichaId)),
                new Update().push("evoluciones", evolucion).set("actualizadoEn", Instant.now()), FichaClinica.class);
    }

    private void marcarComoCorregida(String fichaId, String evolucionId) {
        plantillaMongo.updateFirst(Query.query(Criteria.where("_id").is(fichaId)),
                new Update().filterArray(Criteria.where("elemento.identificador").is(evolucionId))
                        .set("evoluciones.$[elemento].corregida", true),
                FichaClinica.class);
    }

    private java.util.List<CorreccionFicha> agregarCorreccion(FichaClinica ficha, CorreccionFicha correccion) {
        java.util.List<CorreccionFicha> correcciones = new java.util.ArrayList<>(ficha.correcciones());
        correcciones.add(correccion);
        return correcciones;
    }

    private String serializarDatos(FichaClinica ficha) {
        try {
            return convertidorJson.writeValueAsString(FichaClinicaRespuesta.desde(ficha));
        } catch (JsonProcessingException excepcion) {
            throw new IllegalStateException("No fue posible conservar el estado anterior de la ficha", excepcion);
        }
    }

    private FichaClinica buscarFicha(String pacienteId) {
        return repositorioFichas.findByPacienteId(pacienteId)
                .orElseThrow(() -> new RecursoNoEncontrado("El paciente aún no tiene ficha clínica"));
    }

    private void exigirFichaAbierta(FichaClinica ficha) {
        if (ficha.estado() == EstadoFicha.CERRADA) {
            throw new ConflictoDeNegocio("La ficha clínica está cerrada");
        }
    }
}
