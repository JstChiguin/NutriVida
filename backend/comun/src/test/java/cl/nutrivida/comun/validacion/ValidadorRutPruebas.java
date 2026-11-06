package cl.nutrivida.comun.validacion;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ValidadorRutPruebas {

    private final ValidadorRut validador = new ValidadorRut();

    @Test
    void aceptaRutConDigitoVerificadorCorrecto() {
        assertThat(validador.isValid("12345678-5", null)).isTrue();
        assertThat(validador.isValid("11111111-1", null)).isTrue();
    }

    @Test
    void aceptaRutConDigitoK() {
        assertThat(validador.isValid("10000013-K", null)).isTrue();
        assertThat(validador.isValid("10000013-k", null)).isTrue();
    }

    @Test
    void rechazaDigitoVerificadorIncorrecto() {
        assertThat(validador.isValid("12345678-9", null)).isFalse();
    }

    @Test
    void rechazaFormatosInvalidos() {
        assertThat(validador.isValid("123456785", null)).isFalse();
        assertThat(validador.isValid("12.345.678-5", null)).isFalse();
        assertThat(validador.isValid("abc-1", null)).isFalse();
    }

    @Test
    void consideraOpcionalUnValorVacio() {
        assertThat(validador.isValid(null, null)).isTrue();
        assertThat(validador.isValid("  ", null)).isTrue();
    }
}
