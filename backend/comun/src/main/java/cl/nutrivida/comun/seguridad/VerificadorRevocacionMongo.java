package cl.nutrivida.comun.seguridad;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

@Component
public class VerificadorRevocacionMongo implements VerificadorRevocacion {

    static final String COLECCION_TOKENS_REVOCADOS = "tokens_revocados";
    static final String COLECCION_USUARIOS_INVALIDADOS = "usuarios_invalidados";

    private final MongoTemplate plantillaMongo;

    public VerificadorRevocacionMongo(MongoTemplate plantillaMongo) {
        this.plantillaMongo = plantillaMongo;
    }

    @Override
    public boolean estaRevocado(UsuarioAutenticado usuario) {
        Query porToken = Query.query(Criteria.where("_id").is(usuario.identificadorToken()));
        if (plantillaMongo.exists(porToken, COLECCION_TOKENS_REVOCADOS)) {
            return true;
        }
        Query porUsuario = Query.query(Criteria.where("_id").is(usuario.usuarioId())
                .and("desde").gte(usuario.emitidoEn()));
        return plantillaMongo.exists(porUsuario, COLECCION_USUARIOS_INVALIDADOS);
    }
}
