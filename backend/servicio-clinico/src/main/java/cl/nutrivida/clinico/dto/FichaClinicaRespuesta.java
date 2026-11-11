package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.FichaClinica;
import cl.nutrivida.clinico.modelo.FichaClinica.ActividadFisica;
import cl.nutrivida.clinico.modelo.FichaClinica.Antecedentes;
import cl.nutrivida.clinico.modelo.FichaClinica.CorreccionFicha;
import cl.nutrivida.clinico.modelo.FichaClinica.EstadoFicha;
import cl.nutrivida.clinico.modelo.FichaClinica.Evolucion;

import java.time.Instant;
import java.util.List;

public record FichaClinicaRespuesta(
        String id,
        String pacienteId,
        String nutricionistaResponsableId,
        Instant fechaApertura,
        String motivoConsulta,
        Antecedentes antecedentes,
        List<String> alergias,
        List<String> intolerancias,
        String habitosAlimentarios,
        ActividadFisica actividadFisica,
        List<String> objetivosNutricionales,
        String evaluacion,
        String diagnosticoNutricional,
        String planIntervencion,
        String indicaciones,
        EstadoFicha estado,
        List<Evolucion> evoluciones,
        List<CorreccionFicha> correcciones,
        Instant actualizadoEn) {

    public static FichaClinicaRespuesta desde(FichaClinica ficha) {
        return new FichaClinicaRespuesta(ficha.id(), ficha.pacienteId(), ficha.nutricionistaResponsableId(),
                ficha.fechaApertura(), ficha.motivoConsulta(), ficha.antecedentes(), ficha.alergias(),
                ficha.intolerancias(), ficha.habitosAlimentarios(), ficha.actividadFisica(),
                ficha.objetivosNutricionales(), ficha.evaluacion(), ficha.diagnosticoNutricional(),
                ficha.planIntervencion(), ficha.indicaciones(), ficha.estado(), ficha.evoluciones(),
                ficha.correcciones(), ficha.actualizadoEn());
    }
}
