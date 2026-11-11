package cl.nutrivida.comun.seguridad;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServicioTokensPruebas {

    private static final String SECRETO = "secreto-solo-para-pruebas-automatizadas-0123456789";

    private ServicioTokens crearServicio(String secreto, String emisor) {
        return new ServicioTokens(new PropiedadesSeguridad(secreto, 30, emisor, List.of(), List.of(), List.of()));
    }

    @Test
    void generaYValidaUnTokenConSusDatos() {
        ServicioTokens servicio = crearServicio(SECRETO, "nutrivida");
        String token = servicio.generar("u1", "ana@correo.cl", Rol.NUTRICIONISTA);

        UsuarioAutenticado usuario = servicio.validar(token).orElseThrow();

        assertThat(usuario.usuarioId()).isEqualTo("u1");
        assertThat(usuario.correo()).isEqualTo("ana@correo.cl");
        assertThat(usuario.rol()).isEqualTo(Rol.NUTRICIONISTA);
        assertThat(usuario.identificadorToken()).isNotBlank();
    }

    @Test
    void rechazaUnTokenExpirado() {
        ServicioTokens servicio = crearServicio(SECRETO, "nutrivida");
        String token = servicio.generar("u1", "ana@correo.cl", Rol.PACIENTE, Duration.ofSeconds(-5));

        assertThat(servicio.validar(token)).isEmpty();
    }

    @Test
    void rechazaUnTokenFirmadoConOtroSecreto() {
        String tokenAjeno = crearServicio("otro-secreto-distinto-para-pruebas-9876543210", "nutrivida")
                .generar("u1", "ana@correo.cl", Rol.ADMINISTRADOR);

        assertThat(crearServicio(SECRETO, "nutrivida").validar(tokenAjeno)).isEmpty();
    }

    @Test
    void rechazaUnTokenDeOtroEmisor() {
        String token = crearServicio(SECRETO, "otro-emisor").generar("u1", "ana@correo.cl", Rol.PACIENTE);

        assertThat(crearServicio(SECRETO, "nutrivida").validar(token)).isEmpty();
    }

    @Test
    void rechazaTextoQueNoEsUnToken() {
        assertThat(crearServicio(SECRETO, "nutrivida").validar("no-es-un-token")).isEmpty();
    }

    @Test
    void exigeUnSecretoDeLongitudSuficiente() {
        assertThatThrownBy(() -> crearServicio("corto", "nutrivida")).isInstanceOf(IllegalStateException.class);
    }
}
