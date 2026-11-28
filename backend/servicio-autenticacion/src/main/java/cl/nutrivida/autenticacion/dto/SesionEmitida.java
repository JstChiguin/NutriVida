package cl.nutrivida.autenticacion.dto;

import cl.nutrivida.autenticacion.servicio.ServicioRefresco.Emitido;

public record SesionEmitida(RespuestaSesion cuerpo, Emitido refresco) {
}
