package cl.nutrivida.agenda.configuracion;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import java.time.Clock;

@Configuration
@EnableConfigurationProperties(PropiedadesAgenda.class)
public class ConfiguracionAgenda {

    @Bean
    public Clock reloj() {
        return Clock.systemUTC();
    }

    @Bean
    public RestClient clienteRestClinico(PropiedadesAgenda propiedades) {
        return RestClient.builder().baseUrl(propiedades.urlClinico()).build();
    }
}
