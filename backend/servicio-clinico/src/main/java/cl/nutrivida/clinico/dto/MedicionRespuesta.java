package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.Medicion;
import cl.nutrivida.clinico.modelo.Medicion.EstadoMedicion;

import java.time.Instant;
import java.util.Map;

public record MedicionRespuesta(
        String id,
        String pacienteId,
        String nutricionistaId,
        Instant fecha,
        double pesoKg,
        double estaturaCm,
        double imc,
        Double cinturaCm,
        Map<String, Double> otrasMediciones,
        String observaciones,
        EstadoMedicion estado,
        String motivoAnulacion) {

    public static MedicionRespuesta desde(Medicion medicion) {
        return new MedicionRespuesta(medicion.id(), medicion.pacienteId(), medicion.nutricionistaId(), medicion.fecha(),
                medicion.pesoKg(), medicion.estaturaCm(), medicion.imc(), medicion.cinturaCm(),
                medicion.otrasMediciones(), medicion.observaciones(), medicion.estado(), medicion.motivoAnulacion());
    }
}
