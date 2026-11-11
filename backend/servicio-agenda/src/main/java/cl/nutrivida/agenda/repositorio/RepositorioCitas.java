package cl.nutrivida.agenda.repositorio;

import cl.nutrivida.agenda.modelo.Cita;
import cl.nutrivida.agenda.modelo.Cita.EstadoCita;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface RepositorioCitas extends MongoRepository<Cita, String> {

    List<Cita> findByPacienteIdAndEstadoInAndInicioLessThanAndFinGreaterThan(String pacienteId,
                                                                             Collection<EstadoCita> estados,
                                                                             Instant fin, Instant inicio);

    List<Cita> findByNutricionistaIdAndEstadoInAndInicioLessThanAndFinGreaterThan(String nutricionistaId,
                                                                                  Collection<EstadoCita> estados,
                                                                                  Instant fin, Instant inicio);
}
