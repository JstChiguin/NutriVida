package cl.nutrivida.autenticacion.servicio;

import cl.nutrivida.autenticacion.dto.RespuestaSesion;
import cl.nutrivida.autenticacion.dto.SolicitudInicioSesion;
import cl.nutrivida.autenticacion.dto.SolicitudPerfilPaciente;
import cl.nutrivida.autenticacion.dto.SolicitudRegistroPaciente;
import cl.nutrivida.autenticacion.dto.UsuarioRespuesta;
import cl.nutrivida.autenticacion.modelo.TokenRevocado;
import cl.nutrivida.autenticacion.modelo.Usuario;
import cl.nutrivida.autenticacion.repositorio.RepositorioTokensRevocados;
import cl.nutrivida.autenticacion.repositorio.RepositorioUsuarios;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.CredencialesInvalidas;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.ServicioTokens;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class ServicioAutenticacion {

    private final RepositorioUsuarios repositorioUsuarios;
    private final RepositorioTokensRevocados repositorioTokensRevocados;
    private final PasswordEncoder codificadorContrasenas;
    private final ServicioTokens servicioTokens;
    private final ClienteServicioClinico clienteServicioClinico;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioAutenticacion(RepositorioUsuarios repositorioUsuarios,
                                 RepositorioTokensRevocados repositorioTokensRevocados,
                                 PasswordEncoder codificadorContrasenas,
                                 ServicioTokens servicioTokens,
                                 ClienteServicioClinico clienteServicioClinico,
                                 ServicioAuditoria servicioAuditoria) {
        this.repositorioUsuarios = repositorioUsuarios;
        this.repositorioTokensRevocados = repositorioTokensRevocados;
        this.codificadorContrasenas = codificadorContrasenas;
        this.servicioTokens = servicioTokens;
        this.clienteServicioClinico = clienteServicioClinico;
        this.servicioAuditoria = servicioAuditoria;
    }

    public RespuestaSesion registrarPaciente(SolicitudRegistroPaciente solicitud) {
        String correo = normalizarCorreo(solicitud.correo());
        Usuario usuario = guardarUsuarioNuevo(solicitud.nombreCompleto(), correo, solicitud.contrasena(), Rol.PACIENTE);
        try {
            clienteServicioClinico.crearPerfilPaciente(new SolicitudPerfilPaciente(
                    usuario.id(), usuario.nombreCompleto(), correo, solicitud.rut(), solicitud.telefono(),
                    solicitud.fechaNacimiento()));
        } catch (RuntimeException excepcion) {
            repositorioUsuarios.deleteById(usuario.id());
            throw excepcion;
        }
        servicioAuditoria.registrar("usuarios", usuario.id(), "REGISTRO_PACIENTE", null, Map.of("correo", correo));
        return crearSesion(usuario);
    }

    public RespuestaSesion iniciarSesion(SolicitudInicioSesion solicitud) {
        Usuario usuario = repositorioUsuarios.findByCorreo(normalizarCorreo(solicitud.correo()))
                .orElseThrow(() -> new CredencialesInvalidas("Correo o contraseña incorrectos"));
        if (!codificadorContrasenas.matches(solicitud.contrasena(), usuario.hashContrasena())) {
            throw new CredencialesInvalidas("Correo o contraseña incorrectos");
        }
        if (!usuario.activo()) {
            throw new PermisoDenegado("La cuenta se encuentra desactivada");
        }
        Usuario actualizado = repositorioUsuarios.save(usuario.conUltimoAcceso(Instant.now()));
        return crearSesion(actualizado);
    }

    public void cerrarSesion(UsuarioAutenticado usuario, String token) {
        Instant expiracion = servicioTokens.obtenerExpiracion(token);
        repositorioTokensRevocados.save(
                new TokenRevocado(usuario.identificadorToken(), usuario.usuarioId(), Instant.now(), expiracion));
    }

    public UsuarioRespuesta obtenerUsuarioActual(UsuarioAutenticado usuarioAutenticado) {
        Usuario usuario = repositorioUsuarios.findById(usuarioAutenticado.usuarioId())
                .orElseThrow(() -> new RecursoNoEncontrado("El usuario de la sesión ya no existe"));
        return UsuarioRespuesta.desde(usuario);
    }

    public Usuario guardarUsuarioNuevo(String nombreCompleto, String correo, String contrasena, Rol rol) {
        if (repositorioUsuarios.existsByCorreo(correo)) {
            throw new ConflictoDeNegocio("Ya existe un usuario registrado con ese correo");
        }
        Instant ahora = Instant.now();
        Usuario nuevo = new Usuario(null, correo, codificadorContrasenas.encode(contrasena), nombreCompleto.trim(), rol,
                true, ahora, ahora, null, null);
        try {
            return repositorioUsuarios.save(nuevo);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("Ya existe un usuario registrado con ese correo");
        }
    }

    public static String normalizarCorreo(String correo) {
        return correo.trim().toLowerCase();
    }

    private RespuestaSesion crearSesion(Usuario usuario) {
        String token = servicioTokens.generar(usuario.id(), usuario.correo(), usuario.rol());
        return RespuestaSesion.bearer(token, servicioTokens.getExpiracionSegundos(), UsuarioRespuesta.desde(usuario));
    }
}
