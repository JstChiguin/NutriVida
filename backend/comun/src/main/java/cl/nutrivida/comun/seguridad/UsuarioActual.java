package cl.nutrivida.comun.seguridad;

import cl.nutrivida.comun.excepciones.PermisoDenegado;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class UsuarioActual {

    private UsuarioActual() {
    }

    public static UsuarioAutenticado obtener() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacion == null || !(autenticacion.getPrincipal() instanceof UsuarioAutenticado usuario)) {
            throw new PermisoDenegado("Se requiere una sesión autenticada");
        }
        return usuario;
    }

    public static String obtenerTokenActual() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacion == null || !(autenticacion.getCredentials() instanceof String token)) {
            throw new PermisoDenegado("Se requiere una sesión autenticada");
        }
        return token;
    }
}
