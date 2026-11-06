package cl.nutrivida.agenda.repositorio;

import cl.nutrivida.agenda.modelo.Agenda;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RepositorioAgendas extends MongoRepository<Agenda, String> {
}
