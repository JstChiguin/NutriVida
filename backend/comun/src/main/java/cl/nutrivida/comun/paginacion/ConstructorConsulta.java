package cl.nutrivida.comun.paginacion;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public final class ConstructorConsulta {

    private final List<Criteria> condiciones = new ArrayList<>();

    private ConstructorConsulta() {
    }

    public static ConstructorConsulta nuevo() {
        return new ConstructorConsulta();
    }

    public ConstructorConsulta textoEn(String texto, String... campos) {
        if (texto != null && !texto.isBlank()) {
            Pattern patron = Pattern.compile(Pattern.quote(texto.trim()), Pattern.CASE_INSENSITIVE);
            Criteria[] alternativas = new Criteria[campos.length];
            for (int posicion = 0; posicion < campos.length; posicion++) {
                alternativas[posicion] = Criteria.where(campos[posicion]).regex(patron);
            }
            condiciones.add(new Criteria().orOperator(alternativas));
        }
        return this;
    }

    public ConstructorConsulta igual(String campo, Object valor) {
        if (valor != null) {
            condiciones.add(Criteria.where(campo).is(valor));
        }
        return this;
    }

    public ConstructorConsulta contiene(String campo, Object valor) {
        if (valor != null) {
            condiciones.add(Criteria.where(campo).in(valor));
        }
        return this;
    }

    public ConstructorConsulta entreFechas(String campo, Instant desde, Instant hasta) {
        if (desde != null && hasta != null) {
            condiciones.add(Criteria.where(campo).gte(desde).lt(hasta));
        } else if (desde != null) {
            condiciones.add(Criteria.where(campo).gte(desde));
        } else if (hasta != null) {
            condiciones.add(Criteria.where(campo).lt(hasta));
        }
        return this;
    }

    public ConstructorConsulta condicion(Criteria criterio) {
        condiciones.add(criterio);
        return this;
    }

    public Query construir() {
        return condiciones.isEmpty() ? new Query() : new Query(new Criteria().andOperator(condiciones));
    }

    public <T> Page<T> paginar(MongoTemplate plantillaMongo, Pageable paginacion, Class<T> tipo) {
        Query consulta = construir();
        long total = plantillaMongo.count(Query.of(consulta).limit(-1).skip(-1), tipo);
        List<T> elementos = plantillaMongo.find(Query.of(consulta).with(paginacion), tipo);
        return new PageImpl<>(elementos, paginacion, total);
    }

    public <T> List<T> listar(MongoTemplate plantillaMongo, Class<T> tipo) {
        return plantillaMongo.find(construir(), tipo);
    }
}
