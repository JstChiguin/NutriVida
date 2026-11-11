package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.dto.EvolucionMediciones;
import cl.nutrivida.clinico.dto.MedicionRespuesta;
import cl.nutrivida.clinico.dto.SolicitudAnulacionMedicion;
import cl.nutrivida.clinico.dto.SolicitudMedicion;
import cl.nutrivida.clinico.modelo.Medicion;
import cl.nutrivida.clinico.modelo.Medicion.EstadoMedicion;
import cl.nutrivida.clinico.repositorio.RepositorioMediciones;
import cl.nutrivida.clinico.servicio.ControlAcceso.ContextoClinico;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class ServicioMediciones {

    private static final Duration TOLERANCIA_RELOJ = Duration.ofMinutes(5);

    private final RepositorioMediciones repositorioMediciones;
    private final MongoTemplate plantillaMongo;
    private final ControlAcceso controlAcceso;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioMediciones(RepositorioMediciones repositorioMediciones, MongoTemplate plantillaMongo,
                              ControlAcceso controlAcceso, ServicioAuditoria servicioAuditoria) {
        this.repositorioMediciones = repositorioMediciones;
        this.plantillaMongo = plantillaMongo;
        this.controlAcceso = controlAcceso;
        this.servicioAuditoria = servicioAuditoria;
    }

    public MedicionRespuesta registrarMedicion(UsuarioAutenticado usuario, String pacienteId, SolicitudMedicion solicitud) {
        ContextoClinico contexto = controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        Instant fecha = solicitud.fecha() == null ? Instant.now() : solicitud.fecha();
        if (fecha.isAfter(Instant.now().plus(TOLERANCIA_RELOJ))) {
            throw new SolicitudInvalida("La fecha de la medición no puede ser futura");
        }
        double estatura = determinarEstatura(pacienteId, solicitud);
        double imc = CalculadoraIndiceMasaCorporal.calcular(solicitud.pesoKg(), estatura);
        Medicion guardada = repositorioMediciones.save(new Medicion(null, pacienteId, contexto.nutricionista().id(),
                fecha, solicitud.pesoKg(), estatura, imc, solicitud.cinturaCm(), solicitud.otrasMediciones(),
                solicitud.observaciones(), EstadoMedicion.VIGENTE, null, Instant.now(), null));
        servicioAuditoria.registrar("mediciones", guardada.id(), "REGISTRAR_MEDICION", usuario,
                Map.of("pacienteId", pacienteId));
        return MedicionRespuesta.desde(guardada);
    }

    public PaginaRespuesta<MedicionRespuesta> listarMediciones(UsuarioAutenticado usuario, String pacienteId,
                                                               Instant desde, Instant hasta, Pageable paginacion) {
        controlAcceso.validarAccesoClinicoDeLectura(usuario, pacienteId);
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .igual("pacienteId", pacienteId)
                .entreFechas("fecha", desde, hasta);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, Medicion.class), MedicionRespuesta::desde);
    }

    public EvolucionMediciones consultarEvolucion(UsuarioAutenticado usuario, String pacienteId) {
        controlAcceso.validarAccesoClinicoDeLectura(usuario, pacienteId);
        List<Medicion> mediciones = repositorioMediciones
                .findByPacienteIdAndEstadoOrderByFechaAsc(pacienteId, EstadoMedicion.VIGENTE);
        List<EvolucionMediciones.Punto> puntos = mediciones.stream()
                .map(medicion -> new EvolucionMediciones.Punto(medicion.fecha(), medicion.pesoKg(), medicion.imc(),
                        medicion.cinturaCm()))
                .toList();
        return new EvolucionMediciones(pacienteId, puntos, construirResumen(mediciones));
    }

    public MedicionRespuesta anularMedicion(UsuarioAutenticado usuario, String pacienteId, String medicionId,
                                            SolicitudAnulacionMedicion solicitud) {
        controlAcceso.validarAccesoClinicoDeEscritura(usuario, pacienteId);
        Medicion medicion = repositorioMediciones.findById(medicionId)
                .filter(encontrada -> encontrada.pacienteId().equals(pacienteId))
                .orElseThrow(() -> new RecursoNoEncontrado("No existe la medición indicada para el paciente"));
        if (medicion.estado() == EstadoMedicion.ANULADA) {
            throw new ConflictoDeNegocio("La medición ya fue anulada");
        }
        Medicion anulada = repositorioMediciones.save(medicion.anulada(solicitud.motivo()));
        servicioAuditoria.registrar("mediciones", medicionId, "ANULAR_MEDICION", usuario,
                Map.of("motivo", solicitud.motivo()));
        return MedicionRespuesta.desde(anulada);
    }

    private double determinarEstatura(String pacienteId, SolicitudMedicion solicitud) {
        if (solicitud.estaturaCm() != null) {
            return solicitud.estaturaCm();
        }
        return repositorioMediciones.findFirstByPacienteIdAndEstadoOrderByFechaDesc(pacienteId, EstadoMedicion.VIGENTE)
                .map(Medicion::estaturaCm)
                .orElseThrow(() -> new SolicitudInvalida("Debe indicar la estatura en la primera medición"));
    }

    private EvolucionMediciones.Resumen construirResumen(List<Medicion> mediciones) {
        if (mediciones.isEmpty()) {
            return new EvolucionMediciones.Resumen(0, null, null, null, null);
        }
        Medicion primera = mediciones.get(0);
        Medicion ultima = mediciones.get(mediciones.size() - 1);
        double variacion = Math.round((ultima.pesoKg() - primera.pesoKg()) * 10.0) / 10.0;
        return new EvolucionMediciones.Resumen(mediciones.size(), primera.pesoKg(), ultima.pesoKg(), variacion,
                ultima.imc());
    }
}
