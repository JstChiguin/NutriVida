package cl.nutrivida.comun.pruebas;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.Document;
import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

import java.util.concurrent.TimeUnit;

public class CondicionMongoDisponible implements ExecutionCondition {

    private static final String URI_POR_DEFECTO = "mongodb://localhost:27017";

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext contexto) {
        String uri = System.getenv().getOrDefault("NUTRIVIDA_MONGO_SERVIDOR_PRUEBAS", URI_POR_DEFECTO);
        MongoClientSettings configuracion = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(uri))
                .applyToClusterSettings(cluster -> cluster.serverSelectionTimeout(1500, TimeUnit.MILLISECONDS))
                .build();
        try (MongoClient cliente = MongoClients.create(configuracion)) {
            cliente.getDatabase("admin").runCommand(new Document("ping", 1));
            return ConditionEvaluationResult.enabled("MongoDB disponible");
        } catch (RuntimeException excepcion) {
            return ConditionEvaluationResult.disabled("MongoDB no disponible en " + uri);
        }
    }
}
