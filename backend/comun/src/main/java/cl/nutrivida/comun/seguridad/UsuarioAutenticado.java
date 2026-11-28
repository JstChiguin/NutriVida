package cl.nutrivida.comun.seguridad;

import java.time.Instant;

public record UsuarioAutenticado(String usuarioId, String correo, Rol rol, String identificadorToken, Instant emitidoEn) {

    public boolean esAdministrador() {
        return rol == Rol.ADMINISTRADOR;
    }

    public boolean esNutricionista() {
        return rol == Rol.NUTRICIONISTA;
    }

    public boolean esPaciente() {
        return rol == Rol.PACIENTE;
    }
}
