package cl.nutrivida.clinico.controlador;

import cl.nutrivida.comun.auditoria.RegistroAuditoria;
import cl.nutrivida.comun.paginacion.ConstructorConsulta;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.function.Function;

@RestController
@RequestMapping("/api/auditorias")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Auditorías", description = "Consulta de la bitácora de operaciones importantes")
public class ControladorAuditorias {

    private final MongoTemplate plantillaMongo;

    public ControladorAuditorias(MongoTemplate plantillaMongo) {
        this.plantillaMongo = plantillaMongo;
    }

    @GetMapping
    @Operation(summary = "Lista la bitácora con filtros y paginación (solo ADMINISTRADOR)")
    public PaginaRespuesta<RegistroAuditoria> listarAuditorias(
            @RequestParam(required = false) String entidad,
            @RequestParam(required = false) String entidadId,
            @RequestParam(required = false) String operacion,
            @RequestParam(required = false) String usuarioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano) {
        ConstructorConsulta consulta = ConstructorConsulta.nuevo()
                .igual("entidad", entidad)
                .igual("entidadId", entidadId)
                .igual("operacion", operacion)
                .igual("usuarioId", usuarioId)
                .entreFechas("fecha", desde, hasta);
        return PaginaRespuesta.de(
                consulta.paginar(plantillaMongo, ParametrosPagina.crear(pagina, tamano, "fecha", true), RegistroAuditoria.class),
                Function.identity());
    }
}
