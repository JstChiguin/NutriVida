package cl.nutrivida.agenda;

import cl.nutrivida.agenda.clinico.ClienteClinico;
import cl.nutrivida.agenda.clinico.ResumenNutricionista;
import cl.nutrivida.agenda.clinico.ResumenPaciente;
import cl.nutrivida.agenda.clinico.ResumenServicio;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.seguridad.UsuarioActual;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class ClienteClinicoFalso implements ClienteClinico {

    final Map<String, ResumenPaciente> pacientesPorUsuario = new HashMap<>();
    final Map<String, ResumenNutricionista> nutricionistasPorUsuario = new HashMap<>();
    final Map<String, ResumenNutricionista> nutricionistasPorId = new HashMap<>();
    final Map<String, ResumenServicio> servicios = new HashMap<>();
    final List<String> autorizaciones = new ArrayList<>();

    void limpiar() {
        pacientesPorUsuario.clear();
        nutricionistasPorUsuario.clear();
        nutricionistasPorId.clear();
        servicios.clear();
        autorizaciones.clear();
    }

    @Override
    public ResumenPaciente consultarMiPerfilDePaciente() {
        return pacientesPorUsuario.get(UsuarioActual.obtener().usuarioId());
    }

    @Override
    public ResumenPaciente consultarPaciente(String pacienteId) {
        return pacientesPorUsuario.values().stream().filter(paciente -> paciente.id().equals(pacienteId)).findFirst()
                .orElseThrow(() -> new RecursoNoEncontrado("Paciente inexistente"));
    }

    @Override
    public ResumenNutricionista consultarMiPerfilDeNutricionista() {
        return nutricionistasPorUsuario.get(UsuarioActual.obtener().usuarioId());
    }

    @Override
    public ResumenNutricionista consultarNutricionista(String nutricionistaId) {
        ResumenNutricionista nutricionista = nutricionistasPorId.get(nutricionistaId);
        if (nutricionista == null) {
            throw new RecursoNoEncontrado("Nutricionista inexistente");
        }
        return nutricionista;
    }

    @Override
    public ResumenServicio consultarServicio(String servicioId) {
        ResumenServicio servicio = servicios.get(servicioId);
        if (servicio == null) {
            throw new RecursoNoEncontrado("Servicio inexistente");
        }
        return servicio;
    }

    @Override
    public void autorizarNutricionistaSobrePaciente(String pacienteId, String nutricionistaId) {
        autorizaciones.add(pacienteId + ":" + nutricionistaId);
    }
}
