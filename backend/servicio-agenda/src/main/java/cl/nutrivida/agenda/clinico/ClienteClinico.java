package cl.nutrivida.agenda.clinico;

public interface ClienteClinico {

    ResumenPaciente consultarMiPerfilDePaciente();

    ResumenPaciente consultarPaciente(String pacienteId);

    ResumenNutricionista consultarMiPerfilDeNutricionista();

    ResumenNutricionista consultarNutricionista(String nutricionistaId);

    ResumenServicio consultarServicio(String servicioId);

    void autorizarNutricionistaSobrePaciente(String pacienteId, String nutricionistaId);
}
