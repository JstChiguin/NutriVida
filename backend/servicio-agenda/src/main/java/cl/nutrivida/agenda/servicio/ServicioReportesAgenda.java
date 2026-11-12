package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.configuracion.PropiedadesAgenda;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class ServicioReportesAgenda {

    private final MongoTemplate plantillaMongo;
    private final String zonaHoraria;

    public ServicioReportesAgenda(MongoTemplate plantillaMongo, PropiedadesAgenda propiedades) {
        this.plantillaMongo = plantillaMongo;
        this.zonaHoraria = propiedades.zonaHoraria();
    }

    public List<CantidadPorEstado> contarCitasPorEstado(Instant desde, Instant hasta, String nutricionistaId) {
        return ejecutar(List.of(
                new Document("$match", filtro(desde, hasta, nutricionistaId)),
                new Document("$group", new Document("_id", "$estado").append("cantidad", new Document("$sum", 1))),
                new Document("$sort", new Document("_id", 1))))
                .stream().map(fila -> new CantidadPorEstado(fila.getString("_id"), fila.getInteger("cantidad"))).toList();
    }

    public List<AtencionesPorNutricionista> resumirAtencionesPorNutricionista(Instant desde, Instant hasta) {
        return ejecutar(List.of(
                new Document("$match", filtro(desde, hasta, null)),
                new Document("$group", new Document("_id", "$nutricionistaId")
                        .append("nombre", new Document("$first", "$nombreNutricionista"))
                        .append("total", new Document("$sum", 1))
                        .append("realizadas", sumarSegunEstado("REALIZADA"))
                        .append("inasistencias", sumarSegunEstado("INASISTENCIA"))
                        .append("canceladas", sumarSegunEstado("CANCELADA"))),
                new Document("$sort", new Document("total", -1))))
                .stream().map(fila -> new AtencionesPorNutricionista(((ObjectId) fila.get("_id")).toHexString(),
                        fila.getString("nombre"), fila.getInteger("total"), fila.getInteger("realizadas"),
                        fila.getInteger("inasistencias"), fila.getInteger("canceladas"))).toList();
    }

    public List<ServicioSolicitado> listarServiciosMasSolicitados(Instant desde, Instant hasta, int limite) {
        return ejecutar(List.of(
                new Document("$match", filtro(desde, hasta, null)),
                new Document("$group", new Document("_id", "$servicioId")
                        .append("nombre", new Document("$first", "$nombreServicio"))
                        .append("solicitudes", new Document("$sum", 1))),
                new Document("$sort", new Document("solicitudes", -1).append("nombre", 1)),
                new Document("$limit", Math.max(1, Math.min(limite, 50)))))
                .stream().map(fila -> new ServicioSolicitado(((ObjectId) fila.get("_id")).toHexString(),
                        fila.getString("nombre"), fila.getInteger("solicitudes"))).toList();
    }

    public List<ActividadDiaria> resumirActividadPorDia(Instant desde, Instant hasta, String nutricionistaId) {
        Document fechaLocal = new Document("$dateToString", new Document("format", "%Y-%m-%d")
                .append("date", "$inicio").append("timezone", zonaHoraria));
        return ejecutar(List.of(
                new Document("$match", filtro(desde, hasta, nutricionistaId)),
                new Document("$group", new Document("_id", fechaLocal).append("citas", new Document("$sum", 1))),
                new Document("$sort", new Document("_id", 1))))
                .stream().map(fila -> new ActividadDiaria(fila.getString("_id"), fila.getInteger("citas"))).toList();
    }

    public List<CantidadPorEvento> contarEventosDelHistorial(Instant desde, Instant hasta) {
        return ejecutar(List.of(
                new Document("$match", filtro(desde, hasta, null)),
                new Document("$unwind", "$historialEstados"),
                new Document("$group", new Document("_id", "$historialEstados.evento")
                        .append("cantidad", new Document("$sum", 1))),
                new Document("$sort", new Document("cantidad", -1))))
                .stream().map(fila -> new CantidadPorEvento(fila.getString("_id"), fila.getInteger("cantidad"))).toList();
    }

    public PacientesAtendidos contarPacientesAtendidos(Instant desde, Instant hasta) {
        Document filtroAtendidas = filtro(desde, hasta, null).append("estado", "REALIZADA");
        List<Document> resultado = ejecutar(List.of(
                new Document("$match", filtroAtendidas),
                new Document("$group", new Document("_id", "$pacienteId").append("atenciones", new Document("$sum", 1))),
                new Document("$group", new Document("_id", null)
                        .append("pacientes", new Document("$sum", 1))
                        .append("atenciones", new Document("$sum", "$atenciones")))));
        if (resultado.isEmpty()) {
            return new PacientesAtendidos(0, 0);
        }
        return new PacientesAtendidos(resultado.get(0).getInteger("pacientes"), resultado.get(0).getInteger("atenciones"));
    }

    private Document sumarSegunEstado(String estado) {
        return new Document("$sum", new Document("$cond", List.of(new Document("$eq", List.of("$estado", estado)), 1, 0)));
    }

    private Document filtro(Instant desde, Instant hasta, String nutricionistaId) {
        Document filtro = new Document();
        Document rango = new Document();
        if (desde != null) {
            rango.append("$gte", Date.from(desde));
        }
        if (hasta != null) {
            rango.append("$lt", Date.from(hasta));
        }
        if (!rango.isEmpty()) {
            filtro.append("inicio", rango);
        }
        if (nutricionistaId != null) {
            filtro.append("nutricionistaId", new ObjectId(nutricionistaId));
        }
        return filtro;
    }

    private List<Document> ejecutar(List<Document> etapas) {
        return plantillaMongo.getCollection("citas").aggregate(etapas).into(new ArrayList<>());
    }

    public record CantidadPorEstado(String estado, int cantidad) {
    }

    public record AtencionesPorNutricionista(String nutricionistaId, String nombreNutricionista, int total,
                                             int realizadas, int inasistencias, int canceladas) {
    }

    public record ServicioSolicitado(String servicioId, String nombreServicio, int solicitudes) {
    }

    public record ActividadDiaria(String fecha, int citas) {
    }

    public record CantidadPorEvento(String evento, int cantidad) {
    }

    public record PacientesAtendidos(int pacientes, int atenciones) {
    }
}
