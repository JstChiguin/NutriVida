package cl.nutrivida.comun.seguridad;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(PropiedadesSeguridad.class)
public class ConfiguracionSeguridad {

    private static final String[] RUTAS_DOCUMENTACION = {
            "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**"
    };

    @Bean
    public SecurityFilterChain cadenaDeSeguridad(HttpSecurity http, ServicioTokens servicioTokens,
                                                 ObjectProvider<VerificadorRevocacion> verificadorRevocacion,
                                                 RespuestasSeguridadJson respuestasSeguridad,
                                                 PropiedadesSeguridad propiedades) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(configuracionCors(propiedades)))
                .sessionManagement(sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errores -> errores
                        .authenticationEntryPoint(respuestasSeguridad)
                        .accessDeniedHandler(respuestasSeguridad))
                .authorizeHttpRequests(rutas -> {
                    rutas.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    rutas.requestMatchers(RUTAS_DOCUMENTACION).permitAll();
                    if (!propiedades.rutasPublicasGet().isEmpty()) {
                        rutas.requestMatchers(HttpMethod.GET, propiedades.rutasPublicasGet().toArray(String[]::new)).permitAll();
                    }
                    if (!propiedades.rutasPublicasPost().isEmpty()) {
                        rutas.requestMatchers(HttpMethod.POST, propiedades.rutasPublicasPost().toArray(String[]::new)).permitAll();
                    }
                    rutas.anyRequest().authenticated();
                })
                .addFilterBefore(new FiltroAutenticacionJwt(servicioTokens, verificadorRevocacion),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private CorsConfigurationSource configuracionCors(PropiedadesSeguridad propiedades) {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOrigins(propiedades.origenesPermitidos());
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuracion.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", configuracion);
        return fuente;
    }
}
