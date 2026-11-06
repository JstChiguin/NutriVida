package cl.nutrivida.clinico;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"cl.nutrivida.comun", "cl.nutrivida.clinico"})
public class AplicacionClinica {

    public static void main(String[] argumentos) {
        SpringApplication.run(AplicacionClinica.class, argumentos);
    }
}
