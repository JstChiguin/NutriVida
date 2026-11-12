package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Pago;
import cl.nutrivida.agenda.modelo.Pago.Comprobante;
import cl.nutrivida.agenda.modelo.Pago.EstadoPago;
import cl.nutrivida.agenda.modelo.Pago.MetodoSimulado;

import java.time.Instant;

public record PagoRespuesta(
        String id,
        String citaId,
        String pacienteId,
        int monto,
        EstadoPago estado,
        MetodoSimulado metodo,
        Comprobante comprobante,
        Instant creadoEn,
        boolean simulado) {

    public static PagoRespuesta desde(Pago pago) {
        return new PagoRespuesta(pago.id(), pago.citaId(), pago.pacienteId(), pago.monto(), pago.estado(),
                pago.metodo(), pago.comprobante(), pago.creadoEn(), true);
    }
}
