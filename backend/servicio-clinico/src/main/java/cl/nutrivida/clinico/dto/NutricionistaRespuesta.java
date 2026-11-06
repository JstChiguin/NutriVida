package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.Nutricionista;

import java.util.List;

public record NutricionistaRespuesta(
        String id,
        String nombreCompleto,
        String titulo,
        List<String> especialidades,
        String biografia,
        String fotoUrl,
        List<String> serviciosIds,
        boolean activo) {

    public static NutricionistaRespuesta desde(Nutricionista nutricionista) {
        return new NutricionistaRespuesta(nutricionista.id(), nutricionista.nombreCompleto(), nutricionista.titulo(),
                nutricionista.especialidades(), nutricionista.biografia(), nutricionista.fotoUrl(),
                nutricionista.serviciosIds(), nutricionista.activo());
    }
}
