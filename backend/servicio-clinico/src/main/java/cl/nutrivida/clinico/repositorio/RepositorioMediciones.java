package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.Medicion;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RepositorioMediciones extends MongoRepository<Medicion, String> {

    Optional<Medicion> findFirstByPacienteIdAndEstadoOrderByFechaDesc(String pacienteId, Medicion.EstadoMedicion estado);

    List<Medicion> findByPacienteIdAndEstadoOrderByFechaAsc(String pacienteId, Medicion.EstadoMedicion estado);
}
