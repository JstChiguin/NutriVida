import { useState } from 'react';
import { Boton } from '../../components/ui/Boton.jsx';
import { CampoSeleccion, CampoTexto } from '../../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../../components/ui/EstadoConsulta.jsx';
import { Paginador } from '../../components/ui/Paginador.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { describirError } from '../../servicios/clienteApi.js';

function FilaPaciente({ paciente, nutricionistas, onCambio }) {
  const [elegido, setElegido] = useState('');
  const nombrePorId = Object.fromEntries(nutricionistas.map((nutricionista) => [nutricionista.id, nutricionista.nombreCompleto]));
  const disponibles = nutricionistas.filter((nutricionista) => !paciente.nutricionistasAutorizados.includes(nutricionista.id));

  const autorizar = async () => {
    await onCambio(() => clinicoApi.autorizarNutricionista(paciente.id, elegido), 'Nutricionista asignado');
    setElegido('');
  };

  return (
    <li className="rounded-xl border border-gray-100 p-4">
      <p className="font-bold">{paciente.nombreCompleto}</p>
      <p className="mb-2 text-sm text-gray-500">{paciente.correo}</p>
      <ul className="mb-3 flex flex-wrap gap-2">
        {paciente.nutricionistasAutorizados.length === 0 && <li className="text-sm text-gray-500">Sin nutricionistas asignados</li>}
        {paciente.nutricionistasAutorizados.map((nutricionistaId) => (
          <li key={nutricionistaId} className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm">
            {nombrePorId[nutricionistaId] ?? nutricionistaId}
            <button type="button" className="font-bold text-red-600"
              aria-label={`Retirar a ${nombrePorId[nutricionistaId] ?? nutricionistaId} de ${paciente.nombreCompleto}`}
              onClick={() => onCambio(() => clinicoApi.retirarNutricionista(paciente.id, nutricionistaId), 'Asignación retirada')}>×</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <CampoSeleccion etiqueta="Asignar nutricionista" id={`asignar-${paciente.id}`} marcador="Selecciona un profesional" value={elegido}
            onChange={(evento) => setElegido(evento.target.value)}
            opciones={disponibles.map((nutricionista) => ({ valor: nutricionista.id, etiqueta: nutricionista.nombreCompleto }))} />
        </div>
        <Boton className="mb-4" disabled={!elegido} onClick={autorizar}>Asignar</Boton>
      </div>
    </li>
  );
}

export default function AsignacionNutricionistas() {
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(0);
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });
  const pacientes = useConsulta(() => clinicoApi.listarPacientes({ texto, pagina, tamano: 10 }), { texto, pagina });
  const nutricionistas = useConsulta(() => clinicoApi.listarNutricionistas({ tamano: 100 }));

  const aplicarCambio = async (accion, textoExito) => {
    try {
      await accion();
      setResultado({ tipo: 'exito', texto: textoExito });
      pacientes.recargar();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Tarjeta titulo="Asignación de nutricionistas a pacientes">
      <p className="mb-4 text-sm text-gray-600">
        Un nutricionista solo accede a los pacientes asignados. También se asigna automáticamente al confirmar una cita.
      </p>
      <CampoTexto etiqueta="Buscar paciente" id="buscar-paciente" value={texto}
        onChange={(evento) => { setTexto(evento.target.value); setPagina(0); }} />
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <EstadoConsulta cargando={pacientes.cargando || nutricionistas.cargando} error={pacientes.error || nutricionistas.error}
        onReintentar={() => { pacientes.recargar(); nutricionistas.recargar(); }} vacio={pacientes.datos?.contenido.length === 0}
        mensajeVacio="No hay pacientes que coincidan.">
        <ul className="space-y-3">
          {pacientes.datos?.contenido.map((paciente) => (
            <FilaPaciente key={paciente.id} paciente={paciente} nutricionistas={nutricionistas.datos?.contenido ?? []} onCambio={aplicarCambio} />
          ))}
        </ul>
        <Paginador pagina={pagina} totalPaginas={pacientes.datos?.totalPaginas} onCambiar={setPagina} />
      </EstadoConsulta>
    </Tarjeta>
  );
}
