package cl.nutrivida.comun;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConfiguracionOpenApi {

    private static final String ESQUEMA_JWT = "jwt";

    @Bean
    public OpenAPI documentacionApi(@Value("${spring.application.name}") String nombreServicio) {
        SecurityScheme esquemaJwt = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT");
        return new OpenAPI()
                .info(new Info().title("NutriVida - " + nombreServicio).version("1.0.0")
                        .description("API REST de la clínica nutricional NutriVida. Datos exclusivamente ficticios."))
                .components(new Components().addSecuritySchemes(ESQUEMA_JWT, esquemaJwt))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_JWT));
    }
}
