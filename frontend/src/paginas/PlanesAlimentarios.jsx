import { useState } from 'react';
import Contenedor from '../components/layout/Contenedor.jsx';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoAreaTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../components/ui/Insignia.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import { usePacienteActual } from '../hooks/usePacienteActual.js';
import { useConsulta } from '../hooks/useConsulta.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { formatearFecha } from '../utils/formatos.js';
import { convertirComidasATexto, interpretarComidas } from '../utils/planes.js';

function EditorPlan({ pacienteId, planActual, onGuardado }) {
  const [objetivos, setObjetivos] = useState(planActual?.objetivos.join('\n') ?? '');
  const [comidas, setComidas] = useState(planActual ? convertirComidasATexto(planActual.comidas) : '');
  const [recomendaciones, setRecomendaciones] = useState(planActual?.recomendacionesGenerales ?? '');
  const [error, setError] = useState('');

  const guardar = async (evento) => {
    evento.preventDefault();
    const datos = {
      objetivos: objetivos.split('\n').map((linea) => linea.trim()).filter(Boolean),
      comidas: interpretarComidas(comidas),
      recomendacionesGenerales: recomendaciones || null,
    };
    try {
      if (planActual) {
        await clinicoApi.actualizarPlan(planActual.id, datos);
      } else {
        await clinicoApi.crearPlan(pacienteId, datos);
      }
      setError('');
      onGuardado();
    } catch (falla) {
      setError(describirError(falla));
    }
  };

  return (
    <Tarjeta titulo={planActual ? 'Crear nueva versión del plan' : 'Crear plan alimentario'}>
      <Mensaje>{error}</Mensaje>
      <form onSubmit={guardar}>
        <CampoAreaTexto etiqueta="Objetivos (uno por línea)" id="objetivos" required value={objetivos}
          onChange={(evento) => setObjetivos(evento.target.value)} />
        <CampoAreaTexto etiqueta="Comidas (una por línea)" id="comidas" required value={comidas}
          ayuda="Formato: Nombre | Horario | alimento, cantidad, unidad | alimento, cantidad, unidad"
          onChange={(evento) => setComidas(evento.target.value)} />
        <CampoAreaTexto etiqueta="Recomendaciones generales" id="recomendaciones" value={recomendaciones}
          onChange={(evento) => setRecomendaciones(evento.target.value)} />
        <Boton type="submit">{planActual ? 'Guardar nueva versión' : 'Crear plan'}</Boton>
      </form>
    </Tarjeta>
  );
}

function PlanVigente({ plan }) {
  return (
    <Tarjeta titulo={`Plan vigente · versión ${plan.numeroVersion}`}
      acciones={<span className="text-sm text-gray-500">Desde {formatearFecha(plan.vigenteDesde)}</span>}>
      <h3 className="font-semibold">Objetivos</h3>
      <ul className="mb-4 list-disc pl-5">{plan.objetivos.map((objetivo) => <li key={objetivo}>{objetivo}</li>)}</ul>
      <div className="grid gap-3 md:grid-cols-2">
        {plan.comidas.map((comida) => (
          <article key={comida.nombre} className="rounded-lg bg-green-50 p-3">
            <h4 className="font-bold text-exito">{comida.nombre} {comida.horario && <span className="text-sm font-normal">· {comida.horario}</span>}</h4>
            <ul className="text-sm">
              {comida.alimentos.map((item) => <li key={item.alimento}>{item.alimento}: {item.cantidad} {item.unidad}</li>)}
            </ul>
          </article>
        ))}
      </div>
      {plan.recomendacionesGenerales && <p className="mt-4 text-sm text-gray-600">{plan.recomendacionesGenerales}</p>}
    </Tarjeta>
  );
}

export default function PlanesAlimentarios() {
  const { paciente, puedeEscribir, cargando: cargandoPaciente, error: errorPaciente } = usePacienteActual();
  const pacienteId = paciente?.id;
  const vigente = useConsulta(
    () => (pacienteId ? clinicoApi.consultarPlanVigente(pacienteId) : Promise.resolve(null)), { pacienteId },
  );
  const versiones = useConsulta(
    () => (pacienteId ? clinicoApi.listarVersionesPlan(pacienteId) : Promise.resolve(null)), { pacienteId },
  );
  const sinPlan = vigente.error?.mensaje?.includes('no tiene un plan');
  const recargar = () => {
    vigente.recargar();
    versiones.recargar();
  };

  return (
    <Contenedor titulo="Plan alimentario" descripcion={paciente?.nombreCompleto}>
      <EstadoConsulta cargando={cargandoPaciente || vigente.cargando} error={errorPaciente || (sinPlan ? null : vigente.error)}
        onReintentar={recargar}>
        <div className="space-y-5">
          {sinPlan && !puedeEscribir && (
            <p className="py-6 text-center text-gray-500">Aún no tienes un plan alimentario vigente.</p>
          )}
          {vigente.datos && <PlanVigente plan={vigente.datos} />}
          {puedeEscribir && (
            <EditorPlan key={vigente.datos?.id ?? 'nuevo'} pacienteId={pacienteId} planActual={vigente.datos} onGuardado={recargar} />
          )}
          {versiones.datos?.contenido.length > 0 && (
            <Tarjeta titulo="Historial de versiones">
              <ul className="space-y-1 text-sm">
                {versiones.datos.contenido.map((version) => (
                  <li key={version.id} className="flex items-center gap-3">
                    <span>Versión {version.numeroVersion}</span>
                    <span className="text-gray-500">{formatearFecha(version.vigenteDesde)}</span>
                    <Insignia tipo={version.estado === 'VIGENTE' ? 'positivo' : 'neutro'}>{version.estado}</Insignia>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>
      </EstadoConsulta>
    </Contenedor>
  );
}
