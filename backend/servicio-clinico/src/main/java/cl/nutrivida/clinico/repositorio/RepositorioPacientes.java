package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.Paciente;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepositorioPacientes extends MongoRepository<Paciente, String> {

    Optional<Paciente> findByUsuarioId(String usuarioId);

    boolean existsByRut(String rut);
}
