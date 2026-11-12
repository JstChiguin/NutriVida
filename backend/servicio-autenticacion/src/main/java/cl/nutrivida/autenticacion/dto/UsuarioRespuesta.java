package cl.nutrivida.autenticacion.dto;

import cl.nutrivida.autenticacion.modelo.Usuario;
import cl.nutrivida.comun.seguridad.Rol;

import java.time.Instant;

public record UsuarioRespuesta(
        String id,
        String correo,
        String nombreCompleto,
        Rol rol,
        boolean activo,
        Instant creadoEn,
        Instant ultimoAcceso) {

    public static UsuarioRespuesta desde(Usuario usuario) {
        return new UsuarioRespuesta(usuario.id(), usuario.correo(), usuario.nombreCompleto(), usuario.rol(),
                usuario.activo(), usuario.creadoEn(), usuario.ultimoAcceso());
    }
}
