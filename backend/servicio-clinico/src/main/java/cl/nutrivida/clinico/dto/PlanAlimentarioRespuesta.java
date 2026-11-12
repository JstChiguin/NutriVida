package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.PlanAlimentario;
import cl.nutrivida.clinico.modelo.PlanAlimentario.Comida;
import cl.nutrivida.clinico.modelo.PlanAlimentario.EstadoPlan;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PlanAlimentarioRespuesta(
        String id,
        String pacienteId,
        String nutricionistaId,
        int numeroVersion,
        EstadoPlan estado,
        LocalDate vigenteDesde,
        LocalDate vigenteHasta,
        List<String> objetivos,
        List<Comida> comidas,
        String recomendacionesGenerales,
        String planAnteriorId,
        Instant creadoEn) {

    public static PlanAlimentarioRespuesta desde(PlanAlimentario plan) {
        return new PlanAlimentarioRespuesta(plan.id(), plan.pacienteId(), plan.nutricionistaId(), plan.numeroVersion(),
                plan.estado(), convertirFecha(plan.vigenteDesde()), convertirFecha(plan.vigenteHasta()),
                plan.objetivos(), plan.comidas(), plan.recomendacionesGenerales(), plan.planAnteriorId(),
                plan.creadoEn());
    }

    private static LocalDate convertirFecha(String fecha) {
        return fecha == null ? null : LocalDate.parse(fecha);
    }
}
