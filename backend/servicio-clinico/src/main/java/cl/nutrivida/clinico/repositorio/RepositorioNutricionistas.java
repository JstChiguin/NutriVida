package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.Nutricionista;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepositorioNutricionistas extends MongoRepository<Nutricionista, String> {

    Optional<Nutricionista> findByUsuarioId(String usuarioId);
}
