package cl.nutrivida.agenda.dto;

import cl.nutrivida.agenda.modelo.Pago.MetodoSimulado;
import jakarta.validation.constraints.NotNull;

public record SolicitudPago(@NotNull MetodoSimulado metodo, boolean simularRechazo) {
}
