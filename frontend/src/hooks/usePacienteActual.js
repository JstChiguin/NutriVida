import { useParams } from 'react-router-dom';
import { useAutenticacion } from '../hooks/useAutenticacion.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { useConsulta } from './useConsulta.js';

export function usePacienteActual() {
  const { pacienteId } = useParams();
  const { usuario } = useAutenticacion();
  const esPaciente = usuario.rol === 'PACIENTE';
  const consulta = useConsulta(
    () => (esPaciente ? clinicoApi.consultarMiPerfilPaciente() : clinicoApi.consultarPaciente(pacienteId)),
    { esPaciente, pacienteId },
  );
  return { ...consulta, paciente: consulta.datos, puedeEscribir: usuario.rol === 'NUTRICIONISTA' };
}
