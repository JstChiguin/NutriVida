package cl.nutrivida.agenda.controlador;

import cl.nutrivida.agenda.dto.PagoRespuesta;
import cl.nutrivida.agenda.modelo.Pago.EstadoPago;
import cl.nutrivida.agenda.servicio.ServicioPagos;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/pagos")
@Tag(name = "Pagos simulados", description = "Pagos ficticios y comprobantes sin valor tributario")
public class ControladorPagos {

    private final ServicioPagos servicioPagos;

    public ControladorPagos(ServicioPagos servicioPagos) {
        this.servicioPagos = servicioPagos;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Lista pagos simulados con filtros (solo ADMINISTRADOR)")
    public PaginaRespuesta<PagoRespuesta> listarPagos(
            @RequestParam(required = false) EstadoPago estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        return servicioPagos.listarPagos(estado, desde, hasta, ParametrosPagina.crear(pagina, tamano, "creadoEn", true));
    }

    @GetMapping("/{pagoId}")
    @PreAuthorize("hasAnyRole('PACIENTE','ADMINISTRADOR')")
    @Operation(summary = "Consulta un pago y su comprobante ficticio (dueño o administrador)")
    public PagoRespuesta consultarPago(@PathVariable String pagoId) {
        return servicioPagos.consultarPago(UsuarioActual.obtener(), pagoId);
    }

    @PatchMapping("/{pagoId}/anulacion")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Anula un pago simulado aprobado (solo ADMINISTRADOR)")
    public PagoRespuesta anularPago(@PathVariable String pagoId) {
        return servicioPagos.anularPago(UsuarioActual.obtener(), pagoId);
    }
}
