package cl.nutrivida.clinico.servicio;

import cl.nutrivida.clinico.modelo.Nutricionista;
import cl.nutrivida.clinico.modelo.Paciente;
import cl.nutrivida.clinico.repositorio.RepositorioNutricionistas;
import cl.nutrivida.clinico.repositorio.RepositorioPacientes;
import cl.nutrivida.comun.excepciones.PermisoDenegado;
import cl.nutrivida.comun.excepciones.RecursoNoEncontrado;
import cl.nutrivida.comun.seguridad.UsuarioAutenticado;
import org.springframework.stereotype.Component;

@Component
public class ControlAcceso {

    private final RepositorioPacientes repositorioPacientes;
    private final RepositorioNutricionistas repositorioNutricionistas;

    public ControlAcceso(RepositorioPacientes repositorioPacientes, RepositorioNutricionistas repositorioNutricionistas) {
        this.repositorioPacientes = repositorioPacientes;
        this.repositorioNutricionistas = repositorioNutricionistas;
    }

    public Paciente obtenerPacienteDelUsuario(UsuarioAutenticado usuario) {
        return repositorioPacientes.findByUsuarioId(usuario.usuarioId())
                .orElseThrow(() -> new RecursoNoEncontrado("El usuario no tiene un perfil de paciente"));
    }

    public Nutricionista obtenerNutricionistaDelUsuario(UsuarioAutenticado usuario) {
        return repositorioNutricionistas.findByUsuarioId(usuario.usuarioId())
                .orElseThrow(() -> new RecursoNoEncontrado("El usuario no tiene un perfil de nutricionista"));
    }

    public Paciente buscarPaciente(String pacienteId) {
        return repositorioPacientes.findById(pacienteId)
                .orElseThrow(() -> new RecursoNoEncontrado("No existe el paciente solicitado"));
    }

    public Paciente validarAccesoAPerfilDePaciente(UsuarioAutenticado usuario, String pacienteId) {
        if (usuario.esAdministrador()) {
            return buscarPaciente(pacienteId);
        }
        return validarAccesoClinicoDeLectura(usuario, pacienteId);
    }

    public Paciente validarAccesoClinicoDeLectura(UsuarioAutenticado usuario, String pacienteId) {
        Paciente paciente = buscarPaciente(pacienteId);
        boolean esElPropioPaciente = usuario.esPaciente() && paciente.usuarioId().equals(usuario.usuarioId());
        if (esElPropioPaciente || nutricionistaEstaAutorizado(usuario, paciente)) {
            return paciente;
        }
        throw new PermisoDenegado("No tiene autorización para acceder a la información de este paciente");
    }

    public ContextoClinico validarAccesoClinicoDeEscritura(UsuarioAutenticado usuario, String pacienteId) {
        Paciente paciente = buscarPaciente(pacienteId);
        if (!usuario.esNutricionista()) {
            throw new PermisoDenegado("Solo un nutricionista puede registrar información clínica");
        }
        Nutricionista nutricionista = obtenerNutricionistaDelUsuario(usuario);
        if (!nutricionista.activo() || !paciente.tieneAutorizado(nutricionista.id())) {
            throw new PermisoDenegado("No tiene autorización para registrar información de este paciente");
        }
        return new ContextoClinico(paciente, nutricionista);
    }

    private boolean nutricionistaEstaAutorizado(UsuarioAutenticado usuario, Paciente paciente) {
        if (!usuario.esNutricionista()) {
            return false;
        }
        return repositorioNutricionistas.findByUsuarioId(usuario.usuarioId())
                .map(nutricionista -> nutricionista.activo() && paciente.tieneAutorizado(nutricionista.id()))
                .orElse(false);
    }

    public record ContextoClinico(Paciente paciente, Nutricionista nutricionista) {
    }
}
