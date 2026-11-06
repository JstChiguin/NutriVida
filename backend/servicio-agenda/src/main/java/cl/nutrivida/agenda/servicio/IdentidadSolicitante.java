package cl.nutrivida.agenda.servicio;

import cl.nutrivida.agenda.clinico.ClienteClinico;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.stereotype.Component;

@Component
public class IdentidadSolicitante {

    private final ClienteClinico clienteClinico;

    public IdentidadSolicitante(ClienteClinico clienteClinico) {
        this.clienteClinico = clienteClinico;
    }

    public Contexto resolver(UsuarioAutenticado usuario) {
        if (usuario.esPaciente()) {
            return new Contexto(usuario, clienteClinico.consultarMiPerfilDePaciente().id(), null);
        }
        if (usuario.esNutricionista()) {
            return new Contexto(usuario, null, clienteClinico.consultarMiPerfilDeNutricionista().id());
        }
        return new Contexto(usuario, null, null);
    }

    public record Contexto(UsuarioAutenticado usuario, String pacienteId, String nutricionistaId) {

        public boolean puedeVerPaciente(String idPaciente) {
            return usuario.esAdministrador() || idPaciente.equals(pacienteId);
        }

        public boolean puedeGestionarAgendaDe(String idNutricionista) {
            return usuario.esAdministrador() || idNutricionista.equals(nutricionistaId);
        }
    }
}
