package cl.nutrivida.comun.validacion;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class ValidadorRut implements ConstraintValidator<RutValido, String> {

    private static final Pattern FORMATO = Pattern.compile("^\\d{7,8}-[\\dK]$");

    @Override
    public boolean isValid(String rut, ConstraintValidatorContext contexto) {
        if (rut == null || rut.isBlank()) {
            return true;
        }
        String normalizado = rut.trim().toUpperCase();
        if (!FORMATO.matcher(normalizado).matches()) {
            return false;
        }
        String cuerpo = normalizado.substring(0, normalizado.indexOf('-'));
        char digitoIngresado = normalizado.charAt(normalizado.length() - 1);
        return calcularDigitoVerificador(cuerpo) == digitoIngresado;
    }

    public static char calcularDigitoVerificador(String cuerpo) {
        int suma = 0;
        int multiplicador = 2;
        for (int posicion = cuerpo.length() - 1; posicion >= 0; posicion--) {
            suma += Character.getNumericValue(cuerpo.charAt(posicion)) * multiplicador;
            multiplicador = multiplicador == 7 ? 2 : multiplicador + 1;
        }
        int resto = 11 - (suma % 11);
        if (resto == 11) {
            return '0';
        }
        return resto == 10 ? 'K' : (char) ('0' + resto);
    }
}
