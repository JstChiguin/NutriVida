package cl.nutrivida.clinico.servicio;

public final class CalculadoraIndiceMasaCorporal {

    private CalculadoraIndiceMasaCorporal() {
    }

    public static double calcular(double pesoKg, double estaturaCm) {
        double estaturaMetros = estaturaCm / 100.0;
        double indice = pesoKg / (estaturaMetros * estaturaMetros);
        return Math.round(indice * 10.0) / 10.0;
    }
}
