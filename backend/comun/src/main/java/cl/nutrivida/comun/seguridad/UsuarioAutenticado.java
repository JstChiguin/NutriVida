package cl.nutrivida.comun.seguridad;

public record UsuarioAutenticado(String usuarioId, String correo, Rol rol, String identificadorToken) {

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
