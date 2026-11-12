package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.FichaClinica;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepositorioFichasClinicas extends MongoRepository<FichaClinica, String> {

    Optional<FichaClinica> findByPacienteId(String pacienteId);
}
