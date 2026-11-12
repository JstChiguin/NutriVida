package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.PlanAlimentario;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RepositorioPlanesAlimentarios extends MongoRepository<PlanAlimentario, String> {

    Optional<PlanAlimentario> findByPacienteIdAndEstado(String pacienteId, PlanAlimentario.EstadoPlan estado);

    Optional<PlanAlimentario> findFirstByPacienteIdOrderByNumeroVersionDesc(String pacienteId);
}
