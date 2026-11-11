package cl.nutrivida.autenticacion.repositorio;

import cl.nutrivida.autenticacion.modelo.Usuario;
import cl.nutrivida.comun.seguridad.Rol;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepositorioUsuarios extends MongoRepository<Usuario, String> {

    Optional<Usuario> findByCorreo(String correo);

    boolean existsByCorreo(String correo);

    boolean existsByRol(Rol rol);
}
