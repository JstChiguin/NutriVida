package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.dto.PagoRespuesta;
import cl.nutrivida.agenda.dto.SolicitudPago;
import cl.nutrivida.agenda.modelo.Cita;
import cl.nutrivida.agenda.modelo.Pago;
import cl.nutrivida.agenda.modelo.Pago.Comprobante;
import cl.nutrivida.agenda.modelo.Pago.EstadoPago;
import cl.nutrivida.agenda.repositorio.RepositorioPagos;
import cl.nutrivida.agenda.servicio.IdentidadSolicitante.Contexto;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ServicioPagos {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final RepositorioPagos repositorioPagos;
    private final ServicioCitas servicioCitas;
    private final IdentidadSolicitante identidadSolicitante;
    private final MongoTemplate plantillaMongo;
    private final ServicioAuditoria servicioAuditoria;
    private final Clock reloj;

    public ServicioPagos(RepositorioPagos repositorioPagos, ServicioCitas servicioCitas,
                         IdentidadSolicitante identidadSolicitante, MongoTemplate plantillaMongo,
                         ServicioAuditoria servicioAuditoria, Clock reloj) {
        this.repositorioPagos = repositorioPagos;
        this.servicioCitas = servicioCitas;
        this.identidadSolicitante = identidadSolicitante;
        this.plantillaMongo = plantillaMongo;
        this.servicioAuditoria = servicioAuditoria;
        this.reloj = reloj;
    }

    public PagoRespuesta pagarCita(UsuarioAutenticado usuario, String citaId, SolicitudPago solicitud) {
        Contexto contexto = identidadSolicitante.resolver(usuario);
        Cita cita = servicioCitas.cargarConAcceso(contexto, citaId);
        if (usuario.esNutricionista()) {
            throw new PermisoDenegado("Un nutricionista no puede registrar pagos");
        }
        if (!cita.estado().estaActiva()) {
            throw new ConflictoDeNegocio("Solo se pueden pagar citas solicitadas o confirmadas");
        }
        if (repositorioPagos.existsByCitaIdAndEstado(citaId, EstadoPago.APROBADO_SIMULADO)) {
            throw new ConflictoDeNegocio("La cita ya tiene un pago aprobado");
        }
        Instant ahora = reloj.instant();
        boolean aprobado = !solicitud.simularRechazo();
        Comprobante comprobante = aprobado ? emitirComprobante(ahora) : null;
        Pago guardado = repositorioPagos.save(new Pago(null, citaId, cita.pacienteId(), cita.precioReferencial(),
                aprobado ? EstadoPago.APROBADO_SIMULADO : EstadoPago.RECHAZADO_SIMULADO, solicitud.metodo(),
                comprobante, ahora, null));
        if (aprobado) {
            marcarCitaComoPagada(citaId, true);
        }
        servicioAuditoria.registrar("pagos", guardado.id(), "PAGO_SIMULADO", usuario,
                Map.of("citaId", citaId, "estado", guardado.estado().name()));
        return PagoRespuesta.desde(guardado);
    }

    public List<PagoRespuesta> listarPagosDeCita(UsuarioAutenticado usuario, String citaId) {
        servicioCitas.cargarConAcceso(identidadSolicitante.resolver(usuario), citaId);
        if (usuario.esNutricionista()) {
            throw new PermisoDenegado("Un nutricionista no puede consultar pagos");
        }
        return repositorioPagos.findByCitaIdOrderByCreadoEnDesc(citaId).stream().map(PagoRespuesta::desde).toList();
    }

    public PagoRespuesta consultarPago(UsuarioAutenticado usuario, String pagoId) {
        Pago pago = buscarPago(pagoId);
        if (!usuario.esAdministrador()) {
            Contexto contexto = identidadSolicitante.resolver(usuario);
            if (!usuario.esPaciente() || !pago.pacienteId().equals(contexto.pacienteId())) {
                throw new PermisoDenegado("No tiene autorización para consultar este pago");
            }
        }
        return PagoRespuesta.desde(pago);
    }

    public PaginaRespuesta<PagoRespuesta> listarPagos(EstadoPago estado, Instant desde, Instant hasta, Pageable paginacion) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo().igual("estado", estado).entreFechas("creadoEn", desde, hasta);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, Pago.class), PagoRespuesta::desde);
    }

    public PagoRespuesta anularPago(UsuarioAutenticado usuario, String pagoId) {
        Pago pago = buscarPago(pagoId);
        if (pago.estado() != EstadoPago.APROBADO_SIMULADO) {
            throw new ConflictoDeNegocio("Solo se pueden anular pagos aprobados");
        }
        Pago anulado = repositorioPagos.save(pago.anulado());
        marcarCitaComoPagada(pago.citaId(), false);
        servicioAuditoria.registrar("pagos", pagoId, "ANULAR_PAGO_SIMULADO", usuario, Map.of());
        return PagoRespuesta.desde(anulado);
    }

    private Comprobante emitirComprobante(Instant ahora) {
        String sufijo = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String numero = "NV-" + FORMATO_FECHA.format(ahora.atZone(ZoneOffset.UTC)) + "-" + sufijo;
        return new Comprobante(numero, ahora, Pago.GLOSA_SIMULACION);
    }

    private void marcarCitaComoPagada(String citaId, boolean pagada) {
        plantillaMongo.updateFirst(Query.query(Criteria.where("_id").is(citaId)), new Update().set("pagada", pagada),
                Cita.class);
    }

    private Pago buscarPago(String pagoId) {
        return repositorioPagos.findById(pagoId).orElseThrow(() -> new RecursoNoEncontrado("No existe el pago solicitado"));
    }
}
