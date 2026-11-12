package cl.nutrivida.agenda.clinico;

import java.util.List;

public record ResumenNutricionista(String id, String nombreCompleto, List<String> serviciosIds, boolean activo) {
}
