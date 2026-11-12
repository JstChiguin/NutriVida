import { useState } from 'react';
import { Link } from 'react-router-dom';
import Contenedor from '../components/layout/Contenedor.jsx';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoSeleccion, CampoTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../components/ui/Insignia.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import { useConsulta } from '../hooks/useConsulta.js';
import { agendaApi } from '../servicios/agendaApi.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { ETIQUETAS_DIA, ETIQUETAS_ESTADO_CITA, formatearFechaHora } from '../utils/formatos.js';

const DIAS = Object.keys(ETIQUETAS_DIA);
const FILTROS_ESTADO = [{ valor: '', etiqueta: 'Todas' }, ...Object.entries(ETIQUETAS_ESTADO_CITA).map(([valor, etiqueta]) => ({ valor, etiqueta }))];

function FilaCita({ cita, onAccion }) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazando, setRechazando] = useState(false);
  const [reprogramando, setReprogramando] = useState(false);
  const [nuevoInicio, setNuevoInicio] = useState('');
  const [motivoReprogramacion, setMotivoReprogramacion] = useState('');

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{cita.nombrePaciente}</p>
          <p className="text-sm text-gray-600">{cita.nombreServicio} · {formatearFechaHora(cita.inicio)}</p>
          <p className="text-sm text-gray-500">Motivo: {cita.motivoConsulta}</p>
        </div>
        <Insignia tipo={cita.estado}>{ETIQUETAS_ESTADO_CITA[cita.estado]}</Insignia>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {cita.estado === 'SOLICITADA' && (
          <>
            <Boton onClick={() => onAccion(() => agendaApi.confirmarCita(cita.id), 'Cita confirmada')}>Confirmar</Boton>
            <Boton variante="peligro" onClick={() => setRechazando(!rechazando)}>Rechazar</Boton>
          </>
        )}
        {cita.estado === 'CONFIRMADA' && (
          <>
            <Boton onClick={() => onAccion(() => agendaApi.registrarAtencionRealizada(cita.id), 'Atención registrada')}>Atención realizada</Boton>
            <Boton variante="suave" onClick={() => onAccion(() => agendaApi.registrarInasistencia(cita.id), 'Inasistencia registrada')}>Inasistencia</Boton>
            <Boton variante="peligro" onClick={() => onAccion(() => agendaApi.cancelarCita(cita.id, 'Cancelada por el profesional'), 'Cita cancelada')}>Cancelar</Boton>
          </>
        )}
        {(cita.estado === 'SOLICITADA' || cita.estado === 'CONFIRMADA') && (
          <Boton variante="contorno" onClick={() => setReprogramando(!reprogramando)}>Reprogramar</Boton>
        )}
        {cita.estado !== 'SOLICITADA' && cita.estado !== 'RECHAZADA' && cita.estado !== 'CANCELADA' && (
          <Link to={`/pacientes/${cita.pacienteId}/ficha-clinica`} className="self-center text-sm font-semibold text-exito">
            Ver ficha clínica
          </Link>
        )}
      </div>
      {reprogramando && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <CampoTexto etiqueta="Nueva fecha y hora" id={`nuevo-inicio-${cita.id}`} type="datetime-local" step="900" value={nuevoInicio}
            onChange={(evento) => setNuevoInicio(evento.target.value)} />
          <CampoTexto etiqueta="Motivo de la reprogramación" id={`motivo-reprogramacion-${cita.id}`} value={motivoReprogramacion}
            onChange={(evento) => setMotivoReprogramacion(evento.target.value)} />
          <Boton className="mb-4" disabled={!nuevoInicio || !motivoReprogramacion.trim()}
            onClick={() => onAccion(
              () => agendaApi.reprogramarCita(cita.id, new Date(nuevoInicio).toISOString(), motivoReprogramacion.trim()),
              'Cita reprogramada',
            )}>
            Confirmar reprogramación
          </Boton>
        </div>
      )}
      {rechazando && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <CampoTexto etiqueta="Motivo del rechazo" id={`rechazo-${cita.id}`} value={motivoRechazo}
            onChange={(evento) => setMotivoRechazo(evento.target.value)} />
          <Boton variante="peligro" className="mb-4" disabled={!motivoRechazo.trim()}
            onClick={() => onAccion(() => agendaApi.rechazarCita(cita.id, motivoRechazo.trim()), 'Cita rechazada')}>
            Confirmar rechazo
          </Boton>
        </div>
      )}
    </li>
  );
}

function ListaDeCitas() {
  const [estado, setEstado] = useState('SOLICITADA');
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });
  const { datos, cargando, error, recargar } = useConsulta(
    () => agendaApi.listarCitas({ estado, tamano: 50 }), { estado },
  );

  const ejecutar = async (accion, textoExito) => {
    try {
      await accion();
      setResultado({ tipo: 'exito', texto: textoExito });
      recargar();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <>
      <div className="max-w-xs">
        <CampoSeleccion etiqueta="Estado" id="filtro-estado" opciones={FILTROS_ESTADO} value={estado}
          onChange={(evento) => setEstado(evento.target.value)} />
      </div>
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar}
        vacio={datos?.contenido.length === 0} mensajeVacio="No hay citas con este estado.">
        <ul className="space-y-3">
          {datos?.contenido.map((cita) => <FilaCita key={cita.id} cita={cita} onAccion={ejecutar} />)}
        </ul>
      </EstadoConsulta>
    </>
  );
}

function convertirHorarios(horarios) {
  return DIAS.map((dia) => {
    const bloque = horarios.find((candidato) => candidato.dia === dia);
    return { dia, activo: Boolean(bloque), horaInicio: bloque?.horaInicio ?? '09:00', horaFin: bloque?.horaFin ?? '13:00' };
  });
}

function EditorHorarios({ nutricionistaId, agenda, onGuardado }) {
  const [filas, setFilas] = useState(convertirHorarios(agenda?.horariosSemanales ?? []));
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const modificar = (dia, cambios) => setFilas(filas.map((fila) => (fila.dia === dia ? { ...fila, ...cambios } : fila)));

  const guardar = async () => {
    const horarios = filas.filter((fila) => fila.activo).map(({ dia, horaInicio, horaFin }) => ({ dia, horaInicio, horaFin }));
    try {
      await agendaApi.definirHorarios(nutricionistaId, horarios);
      setResultado({ tipo: 'exito', texto: 'Horarios guardados' });
      onGuardado();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Tarjeta titulo="Jornada semanal">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <ul className="mb-4 space-y-2">
        {filas.map((fila) => (
          <li key={fila.dia} className="flex flex-wrap items-center gap-3">
            <label className="flex w-36 items-center gap-2">
              <input type="checkbox" checked={fila.activo} onChange={(evento) => modificar(fila.dia, { activo: evento.target.checked })} />
              {ETIQUETAS_DIA[fila.dia]}
            </label>
            <input type="time" aria-label={`Inicio ${ETIQUETAS_DIA[fila.dia]}`} step="900" disabled={!fila.activo}
              value={fila.horaInicio} onChange={(evento) => modificar(fila.dia, { horaInicio: evento.target.value })}
              className="rounded border border-gray-300 px-2 py-1" />
            <span>a</span>
            <input type="time" aria-label={`Término ${ETIQUETAS_DIA[fila.dia]}`} step="900" disabled={!fila.activo}
              value={fila.horaFin} onChange={(evento) => modificar(fila.dia, { horaFin: evento.target.value })}
              className="rounded border border-gray-300 px-2 py-1" />
          </li>
        ))}
      </ul>
      <Boton onClick={guardar}>Guardar jornada</Boton>
    </Tarjeta>
  );
}

function Bloqueos({ nutricionistaId, agenda, onCambio }) {
  const [valores, setValores] = useState({ inicio: '', fin: '', motivo: '', tipo: 'BLOQUEO' });
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const agregar = async (evento) => {
    evento.preventDefault();
    try {
      await agendaApi.agregarBloqueo(nutricionistaId, {
        inicio: new Date(valores.inicio).toISOString(), fin: new Date(valores.fin).toISOString(),
        motivo: valores.motivo, tipo: valores.tipo,
      });
      setValores({ inicio: '', fin: '', motivo: '', tipo: 'BLOQUEO' });
      setResultado({ tipo: 'exito', texto: 'Bloqueo registrado' });
      onCambio();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  const quitar = async (bloqueoId) => {
    try {
      await agendaApi.quitarBloqueo(nutricionistaId, bloqueoId);
      onCambio();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Tarjeta titulo="Bloqueos y ausencias">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <ul className="mb-4 space-y-2">
        {(agenda?.bloqueos ?? []).map((bloqueo) => (
          <li key={bloqueo.identificador} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{bloqueo.tipo === 'AUSENCIA' ? 'Ausencia' : 'Bloqueo'}: {formatearFechaHora(bloqueo.inicio)} – {formatearFechaHora(bloqueo.fin)} ({bloqueo.motivo})</span>
            <Boton variante="peligro" onClick={() => quitar(bloqueo.identificador)}>Quitar</Boton>
          </li>
        ))}
      </ul>
      <form onSubmit={agregar}>
        <CampoTexto etiqueta="Inicio" id="bloqueo-inicio" type="datetime-local" required value={valores.inicio}
          onChange={(evento) => setValores({ ...valores, inicio: evento.target.value })} />
        <CampoTexto etiqueta="Término" id="bloqueo-fin" type="datetime-local" required value={valores.fin}
          onChange={(evento) => setValores({ ...valores, fin: evento.target.value })} />
        <CampoTexto etiqueta="Motivo" id="bloqueo-motivo" required value={valores.motivo}
          onChange={(evento) => setValores({ ...valores, motivo: evento.target.value })} />
        <CampoSeleccion etiqueta="Tipo" id="bloqueo-tipo" value={valores.tipo}
          opciones={[{ valor: 'BLOQUEO', etiqueta: 'Bloqueo' }, { valor: 'AUSENCIA', etiqueta: 'Ausencia' }]}
          onChange={(evento) => setValores({ ...valores, tipo: evento.target.value })} />
        <Boton type="submit">Agregar</Boton>
      </form>
    </Tarjeta>
  );
}

function ConfiguracionDeAgenda() {
  const perfil = useConsulta(() => clinicoApi.consultarMiPerfilNutricionista());
  const nutricionistaId = perfil.datos?.id;
  const agenda = useConsulta(
    () => (nutricionistaId ? agendaApi.consultarAgenda(nutricionistaId).catch((falla) => (falla.estado === 404 ? null : Promise.reject(falla))) : Promise.resolve(null)),
    { nutricionistaId },
  );

  return (
    <EstadoConsulta cargando={perfil.cargando || agenda.cargando} error={perfil.error || agenda.error}
      onReintentar={() => { perfil.recargar(); agenda.recargar(); }}>
      <div className="grid gap-5 md:grid-cols-2">
        <EditorHorarios key={agenda.datos?.horariosSemanales?.length ?? 0} nutricionistaId={nutricionistaId}
          agenda={agenda.datos} onGuardado={agenda.recargar} />
        <Bloqueos nutricionistaId={nutricionistaId} agenda={agenda.datos} onCambio={agenda.recargar} />
      </div>
    </EstadoConsulta>
  );
}

export default function Agenda() {
  const [pestana, setPestana] = useState('citas');

  return (
    <Contenedor titulo="Mi agenda" descripcion="Gestiona tus citas, tu jornada y tus ausencias.">
      <div role="tablist" className="mb-5 flex gap-2">
        {[['citas', 'Citas'], ['horarios', 'Horarios y bloqueos']].map(([clave, etiqueta]) => (
          <button key={clave} type="button" role="tab" aria-selected={pestana === clave} onClick={() => setPestana(clave)}
            className={`rounded-lg px-4 py-2 font-semibold ${pestana === clave ? 'bg-exito text-white' : 'bg-white text-exito'}`}>
            {etiqueta}
          </button>
        ))}
      </div>
      {pestana === 'citas' ? <ListaDeCitas /> : <ConfiguracionDeAgenda />}
    </Contenedor>
  );
}
