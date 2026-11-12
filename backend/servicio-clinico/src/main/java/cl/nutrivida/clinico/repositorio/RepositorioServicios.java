package cl.nutrivida.clinico.repositorio;

import cl.nutrivida.clinico.modelo.ServicioNutricional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RepositorioServicios extends MongoRepository<ServicioNutricional, String> {

    boolean existsByNombreIgnoreCase(String nombre);
}
