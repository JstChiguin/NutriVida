package cl.nutrivida.autenticacion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"cl.nutrivida.comun", "cl.nutrivida.autenticacion"})
public class AplicacionAutenticacion {

    public static void main(String[] argumentos) {
        SpringApplication.run(AplicacionAutenticacion.class, argumentos);
    }
}
