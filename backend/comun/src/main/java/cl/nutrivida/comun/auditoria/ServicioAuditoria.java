package cl.nutrivida.comun.auditoria;

import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class ServicioAuditoria {

    private final MongoTemplate plantillaMongo;
    private final String nombreServicio;

    public ServicioAuditoria(MongoTemplate plantillaMongo, @Value("${spring.application.name}") String nombreServicio) {
        this.plantillaMongo = plantillaMongo;
        this.nombreServicio = nombreServicio;
    }

    public void registrar(String entidad, String entidadId, String operacion, UsuarioAutenticado responsable,
                          Map<String, Object> detalle) {
        RegistroAuditoria registro = new RegistroAuditoria(
                null,
                nombreServicio,
                entidad,
                entidadId,
                operacion,
                responsable == null ? null : responsable.usuarioId(),
                responsable == null ? null : responsable.rol().name(),
                detalle,
                Instant.now());
        plantillaMongo.insert(registro);
    }
}
