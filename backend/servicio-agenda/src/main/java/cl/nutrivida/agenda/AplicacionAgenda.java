package cl.nutrivida.agenda;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"cl.nutrivida.comun", "cl.nutrivida.agenda"})
public class AplicacionAgenda {

    public static void main(String[] argumentos) {
        SpringApplication.run(AplicacionAgenda.class, argumentos);
    }
}
