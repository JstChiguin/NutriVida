package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.SolicitudContacto;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepositorioSolicitudesContacto extends MongoRepository<SolicitudContacto, String> {

    Optional<SolicitudContacto> findByClaveDuplicado(String claveDuplicado);
}
