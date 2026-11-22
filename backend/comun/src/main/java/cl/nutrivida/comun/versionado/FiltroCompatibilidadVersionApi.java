package cl.nutrivida.comun.versionado;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class FiltroCompatibilidadVersionApi extends OncePerRequestFilter {

    static final String PREFIJO_ANTIGUO = "/api/";
    static final String PREFIJO_VERSIONADO = "/api/v1/";
    static final String ENCABEZADO_OBSOLETO = "Deprecation";
    static final String ENCABEZADO_ENLACE = "Link";

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String ruta = peticion.getRequestURI().substring(peticion.getContextPath().length());
        if (!esRutaAntigua(ruta)) {
            cadena.doFilter(peticion, respuesta);
            return;
        }
        String rutaVersionada = PREFIJO_VERSIONADO + ruta.substring(PREFIJO_ANTIGUO.length());
        String consulta = peticion.getQueryString() == null ? "" : "?" + peticion.getQueryString();
        respuesta.setHeader(ENCABEZADO_OBSOLETO, "true");
        respuesta.setHeader(ENCABEZADO_ENLACE,
                "<" + peticion.getContextPath() + rutaVersionada + consulta + ">; rel=\"successor-version\"");
        cadena.doFilter(new PeticionVersionada(peticion), respuesta);
    }

    static boolean esRutaAntigua(String ruta) {
        return ruta.startsWith(PREFIJO_ANTIGUO) && !ruta.startsWith(PREFIJO_VERSIONADO);
    }

    private static String reescribir(String valor) {
        if (valor == null) {
            return null;
        }
        int posicion = valor.indexOf(PREFIJO_ANTIGUO);
        if (posicion < 0 || valor.startsWith(PREFIJO_VERSIONADO, posicion)) {
            return valor;
        }
        return valor.substring(0, posicion) + PREFIJO_VERSIONADO + valor.substring(posicion + PREFIJO_ANTIGUO.length());
    }

    private static final class PeticionVersionada extends HttpServletRequestWrapper {

        PeticionVersionada(HttpServletRequest peticion) {
            super(peticion);
        }

        @Override
        public String getRequestURI() {
            return reescribir(super.getRequestURI());
        }

        @Override
        public StringBuffer getRequestURL() {
            StringBuffer original = super.getRequestURL();
            return new StringBuffer(reescribir(original.toString()));
        }

        @Override
        public String getServletPath() {
            return reescribir(super.getServletPath());
        }

        @Override
        public String getPathInfo() {
            return reescribir(super.getPathInfo());
        }
    }
}
