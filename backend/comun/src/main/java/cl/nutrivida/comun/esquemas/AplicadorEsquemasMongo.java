package cl.nutrivida.comun.esquemas;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class AplicadorEsquemasMongo implements ApplicationRunner {

    private static final Logger registro = LoggerFactory.getLogger(AplicadorEsquemasMongo.class);

    private final MongoTemplate plantillaMongo;
    private final List<String> colecciones;

    public AplicadorEsquemasMongo(MongoTemplate plantillaMongo,
                                  @Value("${nutrivida.mongo.colecciones-con-esquema:}") List<String> colecciones) {
        this.plantillaMongo = plantillaMongo;
        this.colecciones = colecciones;
    }

    @Override
    public void run(ApplicationArguments argumentos) throws IOException {
        for (String coleccion : colecciones) {
            if (!coleccion.isBlank()) {
                aplicarEsquema(coleccion.trim());
            }
        }
    }

    private void aplicarEsquema(String coleccion) throws IOException {
        Document esquema = leerEsquema(coleccion);
        Document comando = new Document("collMod", coleccion)
                .append("validator", new Document("$jsonSchema", esquema))
                .append("validationLevel", "moderate")
                .append("validationAction", "error");
        if (!plantillaMongo.collectionExists(coleccion)) {
            plantillaMongo.createCollection(coleccion);
        }
        plantillaMongo.getDb().runCommand(comando);
        registro.info("Validador de esquema aplicado a la colección {}", coleccion);
    }

    private Document leerEsquema(String coleccion) throws IOException {
        try (InputStream flujo = new ClassPathResource("esquemas/" + coleccion + ".json").getInputStream()) {
            return Document.parse(new String(flujo.readAllBytes(), StandardCharsets.UTF_8));
        }
    }
}
