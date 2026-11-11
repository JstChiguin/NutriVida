package cl.nutrivida.autenticacion.servicio;

import cl.nutrivida.autenticacion.repositorio.RepositorioUsuarios;
import cl.nutrivida.comun.seguridad.Rol;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class InicializadorAdministrador implements ApplicationRunner {

    private static final Logger registro = LoggerFactory.getLogger(InicializadorAdministrador.class);

    private final RepositorioUsuarios repositorioUsuarios;
    private final ServicioAutenticacion servicioAutenticacion;
    private final String correoAdministrador;
    private final String contrasenaAdministrador;

    public InicializadorAdministrador(RepositorioUsuarios repositorioUsuarios,
                                      ServicioAutenticacion servicioAutenticacion,
                                      @Value("${nutrivida.administrador.correo:}") String correoAdministrador,
                                      @Value("${nutrivida.administrador.contrasena:}") String contrasenaAdministrador) {
        this.repositorioUsuarios = repositorioUsuarios;
        this.servicioAutenticacion = servicioAutenticacion;
        this.correoAdministrador = correoAdministrador;
        this.contrasenaAdministrador = contrasenaAdministrador;
    }

    @Override
    public void run(ApplicationArguments argumentos) {
        boolean hayCredenciales = !correoAdministrador.isBlank() && !contrasenaAdministrador.isBlank();
        if (hayCredenciales && !repositorioUsuarios.existsByRol(Rol.ADMINISTRADOR)) {
            servicioAutenticacion.guardarUsuarioNuevo("Administrador NutriVida",
                    ServicioAutenticacion.normalizarCorreo(correoAdministrador), contrasenaAdministrador,
                    Rol.ADMINISTRADOR);
            registro.info("Se creó la cuenta de administrador inicial");
        }
    }
}
