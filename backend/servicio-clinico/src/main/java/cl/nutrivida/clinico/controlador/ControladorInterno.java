package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.PacienteRespuesta;
import cl.nutrivida.clinico.dto.SolicitudPerfilPaciente;
import cl.nutrivida.clinico.servicio.ServicioPacientes;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Hidden
@RestController
@RequestMapping("/api/internos")
@PreAuthorize("hasRole('SERVICIO_INTERNO')")
public class ControladorInterno {

    private final ServicioPacientes servicioPacientes;

    public ControladorInterno(ServicioPacientes servicioPacientes) {
        this.servicioPacientes = servicioPacientes;
    }

    @PostMapping("/pacientes")
    public ResponseEntity<PacienteRespuesta> crearPerfilPaciente(@Valid @RequestBody SolicitudPerfilPaciente solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioPacientes.crearPerfilDesdeRegistro(solicitud));
    }

    @PostMapping("/pacientes/{pacienteId}/nutricionistas/{nutricionistaId}/autorizacion")
    public PacienteRespuesta autorizarNutricionista(@PathVariable String pacienteId, @PathVariable String nutricionistaId) {
        return servicioPacientes.autorizarNutricionista(UsuarioActual.obtener(), pacienteId, nutricionistaId);
    }
}
