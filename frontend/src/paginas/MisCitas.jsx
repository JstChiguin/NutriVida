import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Comprobante from '../components/citas/Comprobante.jsx';
import PanelPago from '../components/citas/PanelPago.jsx';
import SelectorHorario from '../components/citas/SelectorHorario.jsx';
import Contenedor from '../components/layout/Contenedor.jsx';
import { Boton, EnlaceBoton } from '../components/ui/Boton.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../components/ui/Insignia.jsx';
import { Paginador } from '../components/ui/Paginador.jsx';
import { useConsulta } from '../hooks/useConsulta.js';
import { agendaApi } from '../servicios/agendaApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { notificarCitasActualizadas } from '../utils/eventosCitas.js';
import { ETIQUETAS_ESTADO_CITA, formatearFechaHora, formatearPrecio } from '../utils/formatos.js';

function PanelReprogramacion({ cita, onConfirmar, onCancelar }) {
  const [inicio, setInicio] = useState('');
  return (
    <div className="mt-3 rounded-lg bg-gray-50 p-3">
      <p className="mb-2 text-sm font-semibold">Elige el nuevo horario</p>
      <SelectorHorario nutricionistaId={cita.nutricionistaId} servicioId={cita.servicioId}
        seleccionado={inicio} onSeleccionar={setInicio} />
      <div className="flex gap-2">
        <Boton disabled={!inicio} onClick={() => onConfirmar(inicio)}>Confirmar nuevo horario</Boton>
        <Boton variante="suave" onClick={onCancelar}>Cerrar</Boton>
      </div>
    </div>
  );
}

function PanelComprobante({ cita, onCerrar }) {
  const { datos, cargando, error, recargar } = useConsulta(() => agendaApi.listarPagosDeCita(cita.id), { citaId: cita.id });
  const aprobado = datos?.find((pago) => pago.estado === 'APROBADO_SIMULADO');
  return (
    <div className="mt-3">
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={!aprobado}
        mensajeVacio="No se encontró un comprobante para esta cita.">
        {aprobado && <Comprobante cita={cita} pago={aprobado} />}
      </EstadoConsulta>
      <Boton variante="suave" className="mt-2" onClick={onCerrar}>Cerrar</Boton>
    </div>
  );
}

function TarjetaCita({ cita, onAccion, onReprogramar, onPagoFinalizado }) {
  const [reprogramando, setReprogramando] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [verComprobante, setVerComprobante] = useState(false);
  const activa = cita.estado === 'SOLICITADA' || cita.estado === 'CONFIRMADA';

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{cita.nombreServicio}</p>
          <p className="text-sm text-gray-600">{formatearFechaHora(cita.inicio)} · {cita.nombreNutricionista}</p>
          <p className="text-sm text-gray-500">{cita.duracionMinutos} min · {formatearPrecio(cita.precioReferencial)}</p>
        </div>
        <div className="flex gap-2">
          <Insignia tipo={cita.estado}>{ETIQUETAS_ESTADO_CITA[cita.estado]}</Insignia>
          {cita.pagada && <Insignia tipo="positivo">Pagada (simulado)</Insignia>}
        </div>
      </div>
      {activa && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!cita.pagada && (
            <Boton variante="contorno" onClick={() => setPagando(!pagando)}>Pagar (simulado)</Boton>
          )}
          {cita.pagada && (
            <Boton variante="contorno" onClick={() => setVerComprobante(!verComprobante)}>Ver comprobante</Boton>
          )}
          <Boton variante="contorno" onClick={() => setReprogramando(!reprogramando)}>Reprogramar</Boton>
          <Boton variante="peligro" onClick={() => onAccion(() => agendaApi.cancelarCita(cita.id, 'Cancelada por el paciente'), 'Cita cancelada')}>
            Cancelar cita
          </Boton>
        </div>
      )}
      {pagando && <PanelPago cita={cita} onCerrar={() => setPagando(false)} onPagoFinalizado={onPagoFinalizado} />}
      {verComprobante && cita.pagada && <PanelComprobante cita={cita} onCerrar={() => setVerComprobante(false)} />}
      {reprogramando && (
        <PanelReprogramacion cita={cita} onCancelar={() => setReprogramando(false)}
          onConfirmar={(inicio) => {
            onReprogramar(cita.id, inicio);
            setReprogramando(false);
          }} />
      )}
    </li>
  );
}

export default function MisCitas() {
  const ubicacion = useLocation();
  const [pagina, setPagina] = useState(0);
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: ubicacion.state?.mensaje ?? '' });
  const { datos, cargando, error, recargar } = useConsulta(
    () => agendaApi.listarCitas({ pagina, tamano: 10, descendente: true }),
    { pagina },
  );

  const ejecutar = async (accion, textoExito) => {
    try {
      await accion();
      setResultado({ tipo: 'exito', texto: textoExito });
      notificarCitasActualizadas();
      recargar();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Contenedor titulo="Mis citas" descripcion="Revisa, paga, reprograma o cancela tus atenciones."
      acciones={<EnlaceBoton to="/mis-citas/nueva">Solicitar nueva cita</EnlaceBoton>}>
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar}
        vacio={datos?.contenido.length === 0} mensajeVacio="Aún no tienes citas. ¡Solicita la primera!">
        <ul className="space-y-3">
          {datos?.contenido.map((cita) => (
            <TarjetaCita key={cita.id} cita={cita} onAccion={ejecutar} onPagoFinalizado={() => { notificarCitasActualizadas(); recargar(); }}
              onReprogramar={(citaId, inicio) =>
                ejecutar(() => agendaApi.reprogramarCita(citaId, inicio, 'Reprogramada por el paciente'), 'Cita reprogramada; queda pendiente de confirmación')} />
          ))}
        </ul>
        <Paginador pagina={pagina} totalPaginas={datos?.totalPaginas} onCambiar={setPagina} />
      </EstadoConsulta>
    </Contenedor>
  );
}
