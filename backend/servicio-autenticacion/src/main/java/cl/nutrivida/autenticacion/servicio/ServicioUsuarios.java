package cl.nutrivida.autenticacion.servicio;

import cl.nutrivida.autenticacion.dto.SolicitudActualizarUsuario;
import cl.nutrivida.autenticacion.dto.SolicitudCambioContrasena;
import cl.nutrivida.autenticacion.dto.SolicitudCrearUsuario;
import cl.nutrivida.autenticacion.dto.UsuarioRespuesta;
import cl.nutrivida.autenticacion.modelo.Usuario;
import cl.nutrivida.autenticacion.repositorio.RepositorioUsuarios;
import cl.nutrivida.comun.auditoria.ServicioAuditoria;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import cl.nutrivida.comun.excepciones.CredencialesInvalidas;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.excepciones.SolicitudInvalida;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.seguridad.Rol;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ServicioUsuarios {

    private final RepositorioUsuarios repositorioUsuarios;
    private final MongoTemplate plantillaMongo;
    private final ServicioAutenticacion servicioAutenticacion;
    private final PasswordEncoder codificadorContrasenas;
    private final ServicioAuditoria servicioAuditoria;

    public ServicioUsuarios(RepositorioUsuarios repositorioUsuarios, MongoTemplate plantillaMongo,
                            ServicioAutenticacion servicioAutenticacion, PasswordEncoder codificadorContrasenas,
                            ServicioAuditoria servicioAuditoria) {
        this.repositorioUsuarios = repositorioUsuarios;
        this.plantillaMongo = plantillaMongo;
        this.servicioAutenticacion = servicioAutenticacion;
        this.codificadorContrasenas = codificadorContrasenas;
        this.servicioAuditoria = servicioAuditoria;
    }

    public PaginaRespuesta<UsuarioRespuesta> listarUsuarios(String texto, Rol rol, Boolean activo, Pageable paginacion) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .textoEn(texto, "nombreCompleto", "correo")
                .igual("rol", rol)
                .igual("activo", activo);
        return PaginaRespuesta.de(consulta.paginar(plantillaMongo, paginacion, Usuario.class), UsuarioRespuesta::desde);
    }

    public UsuarioRespuesta consultarUsuario(String usuarioId) {
        return UsuarioRespuesta.desde(buscarUsuario(usuarioId));
    }

    public UsuarioRespuesta crearUsuario(SolicitudCrearUsuario solicitud, UsuarioAutenticado responsable) {
        if (solicitud.rol() == Rol.SERVICIO_INTERNO) {
            throw new SolicitudInvalida("El rol de servicio interno no puede asignarse a usuarios");
        }
        Usuario usuario = servicioAutenticacion.guardarUsuarioNuevo(solicitud.nombreCompleto(),
                ServicioAutenticacion.normalizarCorreo(solicitud.correo()), solicitud.contrasena(), solicitud.rol());
        servicioAuditoria.registrar("usuarios", usuario.id(), "CREAR_USUARIO", responsable,
                Map.of("rol", usuario.rol().name()));
        return UsuarioRespuesta.desde(usuario);
    }

    public UsuarioRespuesta actualizarUsuario(String usuarioId, SolicitudActualizarUsuario solicitud,
                                              UsuarioAutenticado responsable) {
        Usuario existente = buscarUsuario(usuarioId);
        String correoNuevo = ServicioAutenticacion.normalizarCorreo(solicitud.correo());
        if (!correoNuevo.equals(existente.correo()) && repositorioUsuarios.existsByCorreo(correoNuevo)) {
            throw new ConflictoDeNegocio("Ya existe un usuario registrado con ese correo");
        }
        Usuario guardado = guardar(existente.conDatosPersonales(solicitud.nombreCompleto().trim(), correoNuevo));
        servicioAuditoria.registrar("usuarios", usuarioId, "ACTUALIZAR_USUARIO", responsable, Map.of());
        return UsuarioRespuesta.desde(guardado);
    }

    public UsuarioRespuesta cambiarEstado(String usuarioId, boolean activo, UsuarioAutenticado responsable) {
        if (!activo && usuarioId.equals(responsable.usuarioId())) {
            throw new SolicitudInvalida("No puede desactivar su propia cuenta");
        }
        Usuario guardado = guardar(buscarUsuario(usuarioId).conEstado(activo));
        servicioAuditoria.registrar("usuarios", usuarioId, activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
                responsable, Map.of());
        return UsuarioRespuesta.desde(guardado);
    }

    public UsuarioRespuesta cambiarRol(String usuarioId, Rol nuevoRol, UsuarioAutenticado responsable) {
        if (nuevoRol == Rol.SERVICIO_INTERNO) {
            throw new SolicitudInvalida("El rol de servicio interno no puede asignarse a usuarios");
        }
        if (usuarioId.equals(responsable.usuarioId())) {
            throw new SolicitudInvalida("No puede modificar su propio rol");
        }
        Usuario existente = buscarUsuario(usuarioId);
        Usuario guardado = guardar(existente.conRol(nuevoRol));
        servicioAuditoria.registrar("usuarios", usuarioId, "CAMBIAR_ROL", responsable,
                Map.of("rolAnterior", existente.rol().name(), "rolNuevo", nuevoRol.name()));
        return UsuarioRespuesta.desde(guardado);
    }

    public void cambiarContrasena(UsuarioAutenticado usuarioAutenticado, SolicitudCambioContrasena solicitud) {
        Usuario usuario = buscarUsuario(usuarioAutenticado.usuarioId());
        if (!codificadorContrasenas.matches(solicitud.contrasenaActual(), usuario.hashContrasena())) {
            throw new CredencialesInvalidas("La contraseña actual es incorrecta");
        }
        guardar(usuario.conHashContrasena(codificadorContrasenas.encode(solicitud.contrasenaNueva())));
        servicioAuditoria.registrar("usuarios", usuario.id(), "CAMBIAR_CONTRASENA", usuarioAutenticado, Map.of());
    }

    private Usuario buscarUsuario(String usuarioId) {
        return repositorioUsuarios.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe el usuario solicitado"));
    }

    private Usuario guardar(Usuario usuario) {
        try {
            return repositorioUsuarios.save(usuario);
        } catch (DuplicateKeyException excepcion) {
            throw new ConflictoDeNegocio("Ya existe un usuario registrado con ese correo");
        }
    }
}
