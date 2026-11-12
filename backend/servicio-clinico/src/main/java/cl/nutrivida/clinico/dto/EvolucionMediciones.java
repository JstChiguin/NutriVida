package cl.nutrivida.clinico.dto;

import java.time.Instant;
import java.util.List;

public record EvolucionMediciones(String pacienteId, List<Punto> puntos, Resumen resumen) {

    public record Punto(Instant fecha, double pesoKg, double imc, Double cinturaCm) {
    }

    public record Resumen(int cantidadMediciones, Double pesoInicialKg, Double pesoActualKg, Double variacionPesoKg,
                          Double imcActual) {
    }
}
