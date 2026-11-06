package cl.nutrivida.clinico.controlador;

import cl.nutrivida.clinico.dto.PacienteRespuesta;
import cl.nutrivida.clinico.dto.SolicitudActualizarPaciente;
import cl.nutrivida.clinico.dto.SolicitudCambioEstado;
import cl.nutrivida.clinico.servicio.ServicioPacientes;
import cl.nutrivida.comun.paginacion.PaginaRespuesta;
import cl.nutrivida.comun.paginacion.ParametrosPagina;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pacientes")
@Tag(name = "Pacientes", description = "Perfiles de pacientes y autorización de nutricionistas")
public class ControladorPacientes {

    private final ServicioPacientes servicioPacientes;

    public ControladorPacientes(ServicioPacientes servicioPacientes) {
        this.servicioPacientes = servicioPacientes;
    }

    @GetMapping("/yo")
    @PreAuthorize("hasRole('PACIENTE')")
    @Operation(summary = "Perfil del paciente autenticado")
    public PacienteRespuesta obtenerMiPerfil() {
        return servicioPacientes.obtenerMiPerfil(UsuarioActual.obtener());
    }

    @PutMapping("/yo")
    @PreAuthorize("hasRole('PACIENTE')")
    @Operation(summary = "Actualiza los datos personales permitidos del paciente autenticado")
    public PacienteRespuesta actualizarMiPerfil(@Valid @RequestBody SolicitudActualizarPaciente solicitud) {
        return servicioPacientes.actualizarMiPerfil(UsuarioActual.obtener(), solicitud);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','NUTRICIONISTA')")
    @Operation(summary = "Busca pacientes. El nutricionista solo ve a sus pacientes autorizados")
    public PaginaRespuesta<PacienteRespuesta> listarPacientes(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) Boolean activo,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            @RequestParam(defaultValue = "nombreCompleto") String ordenarPor,
            @RequestParam(defaultValue = "false") boolean descendente) {
        return servicioPacientes.listarPacientes(UsuarioActual.obtener(), texto, activo,
                ParametrosPagina.crear(pagina, tamano, camposOrdenables(ordenarPor), descendente));
    }

    @GetMapping("/{pacienteId}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','NUTRICIONISTA','PACIENTE')")
    @Operation(summary = "Consulta un paciente. Exige ser administrador, nutricionista autorizado o el propio paciente")
    public PacienteRespuesta consultarPaciente(@PathVariable String pacienteId) {
        return servicioPacientes.consultarPaciente(UsuarioActual.obtener(), pacienteId);
    }

    @PutMapping("/{pacienteId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Actualiza los datos de un paciente (solo ADMINISTRADOR)")
    public PacienteRespuesta actualizarPaciente(@PathVariable String pacienteId,
                                                @Valid @RequestBody SolicitudActualizarPaciente solicitud) {
        return servicioPacientes.actualizarPaciente(UsuarioActual.obtener(), pacienteId, solicitud);
    }

    @PatchMapping("/{pacienteId}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Activa o desactiva un paciente (solo ADMINISTRADOR)")
    public PacienteRespuesta cambiarEstado(@PathVariable String pacienteId,
                                           @Valid @RequestBody SolicitudCambioEstado solicitud) {
        return servicioPacientes.cambiarEstado(UsuarioActual.obtener(), pacienteId, solicitud.activo());
    }

    @DeleteMapping("/{pacienteId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Desactiva al paciente (eliminación lógica que conserva el historial clínico)")
    public ResponseEntity<Void> desactivarPaciente(@PathVariable String pacienteId) {
        servicioPacientes.cambiarEstado(UsuarioActual.obtener(), pacienteId, false);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{pacienteId}/nutricionistas/{nutricionistaId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Autoriza a un nutricionista a atender a un paciente (solo ADMINISTRADOR)")
    public PacienteRespuesta autorizarNutricionista(@PathVariable String pacienteId,
                                                    @PathVariable String nutricionistaId) {
        return servicioPacientes.autorizarNutricionista(UsuarioActual.obtener(), pacienteId, nutricionistaId);
    }

    @DeleteMapping("/{pacienteId}/nutricionistas/{nutricionistaId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Operation(summary = "Retira la autorización de un nutricionista sobre un paciente (solo ADMINISTRADOR)")
    public PacienteRespuesta retirarAutorizacion(@PathVariable String pacienteId, @PathVariable String nutricionistaId) {
        return servicioPacientes.retirarAutorizacion(UsuarioActual.obtener(), pacienteId, nutricionistaId);
    }

    private String camposOrdenables(String campo) {
        return switch (campo) {
            case "correo", "creadoEn", "activo" -> campo;
            default -> "nombreCompleto";
        };
    }
}
