package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.modelo.Paciente;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ServicioReportesClinicos {

    private static final String FORMATO_MES = "%Y-%m";

    private final MongoTemplate plantillaMongo;

    public ServicioReportesClinicos(MongoTemplate plantillaMongo) {
        this.plantillaMongo = plantillaMongo;
    }

    public ResumenPacientes resumirPacientes(Instant desde, Instant hasta) {
        long total = plantillaMongo.count(new Query(), Paciente.class);
        long activos = plantillaMongo.count(Query.query(Criteria.where("activo").is(true)), Paciente.class);
        return new ResumenPacientes(total, activos, total - activos, contarRegistrosPorMes(desde, hasta));
    }

    private List<RegistroMensual> contarRegistrosPorMes(Instant desde, Instant hasta) {
        Criteria filtro = new Criteria();
        if (desde != null && hasta != null) {
            filtro = Criteria.where("creadoEn").gte(desde).lt(hasta);
        } else if (desde != null) {
            filtro = Criteria.where("creadoEn").gte(desde);
        } else if (hasta != null) {
            filtro = Criteria.where("creadoEn").lt(hasta);
        }
        Aggregation agregacion = Aggregation.newAggregation(
                Aggregation.match(filtro),
                Aggregation.project().and(DateOperators.dateOf("creadoEn").toString(FORMATO_MES)).as("mes"),
                Aggregation.group("mes").count().as("cantidad"),
                Aggregation.sort(Sort.by("_id")));
        return plantillaMongo.aggregate(agregacion, Paciente.class, Document.class).getMappedResults().stream()
                .map(documento -> new RegistroMensual(documento.getString("_id"), documento.getInteger("cantidad")))
                .toList();
    }

    public record ResumenPacientes(long totalRegistrados, long activos, long inactivos,
                                   List<RegistroMensual> registradosPorMes) {
    }

    public record RegistroMensual(String mes, int cantidad) {
    }
}
