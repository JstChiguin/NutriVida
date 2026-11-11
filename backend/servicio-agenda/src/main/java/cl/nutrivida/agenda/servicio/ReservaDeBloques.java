package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.modelo.OcupacionAgenda;
import cl.nutrivida.comun.excepciones.ConflictoDeNegocio;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ReservaDeBloques {

    private final MongoTemplate plantillaMongo;

    public ReservaDeBloques(MongoTemplate plantillaMongo) {
        this.plantillaMongo = plantillaMongo;
    }

    public List<Instant> calcularBloques(Instant inicio, Instant fin) {
        List<Instant> bloques = new ArrayList<>();
        for (Instant bloque = inicio; bloque.isBefore(fin); bloque = Calendario.sumarMinutos(bloque, Calendario.BLOQUE_MINUTOS)) {
            bloques.add(bloque);
        }
        return bloques;
    }

    public void reservar(String citaId, String nutricionistaId, Instant inicio, Instant fin) {
        reservarBloques(citaId, nutricionistaId, calcularBloques(inicio, fin));
    }

    public void reubicar(String citaId, String nutricionistaId, Instant inicioActual, Instant finActual,
                         Instant inicioNuevo, Instant finNuevo) {
        Set<Instant> actuales = Set.copyOf(calcularBloques(inicioActual, finActual));
        List<Instant> nuevos = calcularBloques(inicioNuevo, finNuevo);
        List<Instant> porReservar = nuevos.stream().filter(bloque -> !actuales.contains(bloque)).toList();
        reservarBloques(citaId, nutricionistaId, porReservar);
        Set<Instant> conservar = Set.copyOf(nuevos);
        List<String> porLiberar = actuales.stream().filter(bloque -> !conservar.contains(bloque))
                .map(bloque -> identificador(nutricionistaId, bloque)).collect(Collectors.toList());
        if (!porLiberar.isEmpty()) {
            plantillaMongo.remove(Query.query(Criteria.where("_id").in(porLiberar)), OcupacionAgenda.class);
        }
    }

    public void liberar(String citaId) {
        plantillaMongo.remove(Query.query(Criteria.where("citaId").is(citaId)), OcupacionAgenda.class);
    }

    public Set<Instant> consultarBloquesOcupados(String nutricionistaId, Instant desde, Instant hasta,
                                                 String citaIgnoradaId) {
        Criteria criterio = Criteria.where("nutricionistaId").is(nutricionistaId).and("bloqueInicio").gte(desde).lt(hasta);
        return plantillaMongo.find(Query.query(criterio), OcupacionAgenda.class).stream()
                .filter(ocupacion -> citaIgnoradaId == null || !ocupacion.citaId().equals(citaIgnoradaId))
                .map(OcupacionAgenda::bloqueInicio)
                .collect(Collectors.toSet());
    }

    private void reservarBloques(String citaId, String nutricionistaId, List<Instant> bloques) {
        List<String> insertados = new ArrayList<>();
        try {
            for (Instant bloque : bloques) {
                String identificador = identificador(nutricionistaId, bloque);
                plantillaMongo.insert(new OcupacionAgenda(identificador, nutricionistaId, bloque, citaId));
                insertados.add(identificador);
            }
        } catch (DuplicateKeyException excepcion) {
            if (!insertados.isEmpty()) {
                plantillaMongo.remove(Query.query(Criteria.where("_id").in(insertados)), OcupacionAgenda.class);
            }
            throw new ConflictoDeNegocio("El horario seleccionado ya fue reservado por otra solicitud");
        }
    }

    private String identificador(String nutricionistaId, Instant bloque) {
        return nutricionistaId + "|" + bloque.toEpochMilli();
    }
}
