package cl.nutrivida.agenda.controlador;

import cl.nutrivida.agenda.clinico.ClienteClinico;
import cl.nutrivida.agenda.dto.AgendaRespuesta;
import cl.nutrivida.agenda.dto.SolicitudBloqueo;
import cl.nutrivida.agenda.dto.SolicitudHorarios;
import cl.nutrivida.agenda.servicio.ServicioAgendas;
import cl.nutrivida.agenda.servicio.ServicioAgendas.DisponibilidadDiaria;
import cl.nutrivida.comun.seguridad.UsuarioActual;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/agendas/{nutricionistaId}")
@Tag(name = "Agendas", description = "Horarios semanales, bloqueos, ausencias y disponibilidad")
public class ControladorAgendas {

    private final ServicioAgendas servicioAgendas;
    private final ClienteClinico clienteClinico;

    public ControladorAgendas(ServicioAgendas servicioAgendas, ClienteClinico clienteClinico) {
        this.servicioAgendas = servicioAgendas;
        this.clienteClinico = clienteClinico;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','NUTRICIONISTA')")
    @Operation(summary = "Consulta horarios y bloqueos (administrador o dueño de la agenda)")
    public AgendaRespuesta consultarAgenda(@PathVariable String nutricionistaId) {
        return servicioAgendas.consultarAgenda(UsuarioActual.obtener(), nutricionistaId);
    }

    @PutMapping("/horarios")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','NUTRICIONISTA')")
    @Operation(summary = "Define los horarios semanales (administrador o dueño de la agenda)")
    public AgendaRespuesta definirHorarios(@PathVariable String nutricionistaId,
                                           @Valid @RequestBody SolicitudHorarios solicitud) {
        return servicioAgendas.definirHorarios(UsuarioActual.obtener(), nutricionistaId, solicitud);
    }

    @PostMapping("/bloqueos")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','NUTRICIONISTA')")
    @Operation(summary = "Registra un bloqueo o ausencia; falla si afecta citas activas")
    public ResponseEntity<AgendaRespuesta> agregarBloqueo(@PathVariable String nutricionistaId,
                                                          @Valid @RequestBody SolicitudBloqueo solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicioAgendas.agregarBloqueo(UsuarioActual.obtener(), nutricionistaId, solicitud));
    }

    @DeleteMapping("/bloqueos/{bloqueoId}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','NUTRICIONISTA')")
    @Operation(summary = "Elimina un bloqueo o ausencia")
    public AgendaRespuesta quitarBloqueo(@PathVariable String nutricionistaId, @PathVariable String bloqueoId) {
        return servicioAgendas.quitarBloqueo(UsuarioActual.obtener(), nutricionistaId, bloqueoId);
    }

    @GetMapping("/disponibilidad")
    @Operation(summary = "Horarios libres para un servicio, por día o semana (requiere sesión)")
    public List<DisponibilidadDiaria> consultarDisponibilidad(
            @PathVariable String nutricionistaId,
            @RequestParam String servicioId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(defaultValue = "1") int dias) {
        int duracion = clienteClinico.consultarServicio(servicioId).duracionMinutos();
        return servicioAgendas.consultarDisponibilidad(nutricionistaId, duracion, fecha, dias);
    }
}
