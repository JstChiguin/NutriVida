package cl.nutrivida.autenticacion.repositorio;

import cl.nutrivida.autenticacion.modelo.TokenRevocado;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RepositorioTokensRevocados extends MongoRepository<TokenRevocado, String> {
}
