package cl.nutrivida.agenda.configuracion;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nutrivida.agenda")
public record PropiedadesAgenda(String zonaHoraria, int horasMinimasCancelacion, int pasoOfertaMinutos,
                                String urlClinico) {

    public PropiedadesAgenda {
        zonaHoraria = zonaHoraria == null || zonaHoraria.isBlank() ? "America/Santiago" : zonaHoraria;
        horasMinimasCancelacion = horasMinimasCancelacion < 0 ? 2 : horasMinimasCancelacion;
        pasoOfertaMinutos = pasoOfertaMinutos <= 0 ? 30 : pasoOfertaMinutos;
    }
}
