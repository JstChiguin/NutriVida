package cl.nutrivida.autenticacion.dto;

import cl.nutrivida.comun.seguridad.Rol;
import jakarta.validation.constraints.NotNull;

public record SolicitudCambioRol(@NotNull Rol rol) {
}
