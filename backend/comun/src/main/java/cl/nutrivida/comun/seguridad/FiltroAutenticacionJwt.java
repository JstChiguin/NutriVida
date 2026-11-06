package cl.nutrivida.comun.seguridad;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class FiltroAutenticacionJwt extends OncePerRequestFilter {

    private static final String PREFIJO_BEARER = "Bearer ";

    private final ServicioTokens servicioTokens;
    private final ObjectProvider<VerificadorRevocacion> verificadorRevocacion;

    public FiltroAutenticacionJwt(ServicioTokens servicioTokens, ObjectProvider<VerificadorRevocacion> verificadorRevocacion) {
        this.servicioTokens = servicioTokens;
        this.verificadorRevocacion = verificadorRevocacion;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String cabecera = peticion.getHeader(HttpHeaders.AUTHORIZATION);
        if (cabecera != null && cabecera.startsWith(PREFIJO_BEARER)) {
            String token = cabecera.substring(PREFIJO_BEARER.length());
            servicioTokens.validar(token)
                    .filter(this::noEstaRevocado)
                    .ifPresent(usuario -> establecerAutenticacion(usuario, token));
        }
        cadena.doFilter(peticion, respuesta);
    }

    private boolean noEstaRevocado(UsuarioAutenticado usuario) {
        VerificadorRevocacion verificador = verificadorRevocacion.getIfAvailable();
        return verificador == null || !verificador.estaRevocado(usuario.identificadorToken());
    }

    private void establecerAutenticacion(UsuarioAutenticado usuario, String token) {
        var autoridad = new SimpleGrantedAuthority("ROLE_" + usuario.rol().name());
        var autenticacion = new UsernamePasswordAuthenticationToken(usuario, token, List.of(autoridad));
        SecurityContextHolder.getContext().setAuthentication(autenticacion);
    }
}
