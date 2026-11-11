package cl.nutrivida.agenda.servicio;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

public final class Calendario {

    public static final int BLOQUE_MINUTOS = 15;

    private Calendario() {
    }

    public static boolean estaAlineadoAlBloque(Instant instante, ZoneId zona) {
        ZonedDateTime local = instante.atZone(zona);
        return local.getMinute() % BLOQUE_MINUTOS == 0 && local.getSecond() == 0 && local.getNano() == 0;
    }

    public static boolean seSuperponen(Instant inicioA, Instant finA, Instant inicioB, Instant finB) {
        return inicioA.isBefore(finB) && finA.isAfter(inicioB);
    }

    public static Instant sumarMinutos(Instant instante, int minutos) {
        return instante.plus(minutos, ChronoUnit.MINUTES);
    }
}
