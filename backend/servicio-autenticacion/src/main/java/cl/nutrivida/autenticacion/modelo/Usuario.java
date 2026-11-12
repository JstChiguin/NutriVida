package cl.nutrivida.autenticacion.modelo;

import cl.nutrivida.comun.seguridad.Rol;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "usuarios")
public record Usuario(
        @Id String id,
        @Indexed(unique = true) String correo,
        String hashContrasena,
        String nombreCompleto,
        Rol rol,
        boolean activo,
        Instant creadoEn,
        Instant actualizadoEn,
        Instant ultimoAcceso,
        @Version Long version) {

    public Usuario conDatosPersonales(String nuevoNombreCompleto, String nuevoCorreo) {
        return new Usuario(id, nuevoCorreo, hashContrasena, nuevoNombreCompleto, rol, activo, creadoEn, Instant.now(),
                ultimoAcceso, version);
    }

    public Usuario conEstado(boolean nuevoEstado) {
        return new Usuario(id, correo, hashContrasena, nombreCompleto, rol, nuevoEstado, creadoEn, Instant.now(),
                ultimoAcceso, version);
    }

    public Usuario conRol(Rol nuevoRol) {
        return new Usuario(id, correo, hashContrasena, nombreCompleto, nuevoRol, activo, creadoEn, Instant.now(),
                ultimoAcceso, version);
    }

    public Usuario conHashContrasena(String nuevoHash) {
        return new Usuario(id, correo, nuevoHash, nombreCompleto, rol, activo, creadoEn, Instant.now(), ultimoAcceso,
                version);
    }

    public Usuario conUltimoAcceso(Instant instante) {
        return new Usuario(id, correo, hashContrasena, nombreCompleto, rol, activo, creadoEn, actualizadoEn, instante,
                version);
    }
}
