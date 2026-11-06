package cl.nutrivida.autenticacion.configuracion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;

@Configuration
public class ConfiguracionAutenticacion {

    @Bean
    public PasswordEncoder codificadorContrasenas() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public RestClient clienteRestClinico(@Value("${nutrivida.servicios.clinico-url}") String urlBase) {
        return RestClient.builder().baseUrl(urlBase).build();
    }
}
