package cl.nutrivida.agenda.repositorio;

import cl.nutrivida.agenda.modelo.Pago;
import cl.nutrivida.agenda.modelo.Pago.EstadoPago;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RepositorioPagos extends MongoRepository<Pago, String> {

    List<Pago> findByCitaIdOrderByCreadoEnDesc(String citaId);

    boolean existsByCitaIdAndEstado(String citaId, EstadoPago estado);
}
