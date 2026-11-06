package cl.nutrivida.comun.seguridad;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

@Component
public class VerificadorRevocacionMongo implements VerificadorRevocacion {

    static final String COLECCION_TOKENS_REVOCADOS = "tokens_revocados";

    private final MongoTemplate plantillaMongo;

    public VerificadorRevocacionMongo(MongoTemplate plantillaMongo) {
        this.plantillaMongo = plantillaMongo;
    }

    @Override
    public boolean estaRevocado(String identificadorToken) {
        Query consulta = Query.query(Criteria.where("_id").is(identificadorToken));
        return plantillaMongo.exists(consulta, COLECCION_TOKENS_REVOCADOS);
    }
}
