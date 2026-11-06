package cl.nutrivida.clinico.dto;

import cl.nutrivida.clinico.modelo.FichaClinica.ActividadFisica;
import cl.nutrivida.clinico.modelo.FichaClinica.Antecedentes;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record DatosFichaClinica(
        @NotBlank @Size(max = 1000) String motivoConsulta,
        @Valid Antecedentes antecedentes,
        List<@NotBlank @Size(max = 120) String> alergias,
        List<@NotBlank @Size(max = 120) String> intolerancias,
        @Size(max = 2000) String habitosAlimentarios,
        @Valid ActividadFisica actividadFisica,
        List<@NotBlank @Size(max = 300) String> objetivosNutricionales,
        @Size(max = 3000) String evaluacion,
        @Size(max = 1000) String diagnosticoNutricional,
        @Size(max = 3000) String planIntervencion,
        @Size(max = 3000) String indicaciones) {
}
