import { useState } from 'react';
import { Boton } from '../ui/Boton.jsx';
import { CampoSeleccion } from '../ui/Campo.jsx';
import { Mensaje } from '../ui/EstadoConsulta.jsx';
import { agendaApi } from '../../servicios/agendaApi.js';
import { describirError } from '../../servicios/clienteApi.js';
import { formatearFechaHora, formatearPrecio } from '../../utils/formatos.js';
import Comprobante from './Comprobante.jsx';

const METODOS = [
  { valor: 'TARJETA_SIMULADA', etiqueta: 'Tarjeta (simulada)' },
  { valor: 'TRANSFERENCIA_SIMULADA', etiqueta: 'Transferencia (simulada)' },
  { valor: 'EFECTIVO_SIMULADO', etiqueta: 'Efectivo en clínica (simulado)' },
];

export default function PanelPago({ cita, onPagoFinalizado, onCerrar }) {
  const [metodo, setMetodo] = useState('TARJETA_SIMULADA');
  const [simularRechazo, setSimularRechazo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const confirmar = async () => {
    setProcesando(true);
    try {
      const pago = await agendaApi.pagarCita(cita.id, metodo, simularRechazo);
      if (pago.estado === 'APROBADO_SIMULADO') {
        setResultado({ tipo: 'aprobado', pago });
      } else {
        setResultado({ tipo: 'rechazado' });
      }
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    } finally {
      setProcesando(false);
    }
  };

  if (resultado?.tipo === 'aprobado') {
    return (
      <section className="mt-3" aria-label="Resultado del pago">
        <Mensaje tipo="exito">Pago simulado aprobado. La reserva quedó registrada como pagada.</Mensaje>
        <Comprobante cita={cita} pago={resultado.pago} />
        <Boton variante="suave" className="mt-2" onClick={() => {
          onCerrar();
          onPagoFinalizado();
        }}>Cerrar</Boton>
      </section>
    );
  }

  return (
    <section className="mt-3 rounded-lg bg-gray-50 p-3" aria-label="Pago simulado">
      <h3 className="mb-2 text-base font-bold">Resumen y pago simulado</h3>
      <p className="text-sm">{cita.nombreServicio} con {cita.nombreNutricionista}</p>
      <p className="text-sm">{formatearFechaHora(cita.inicio)}</p>
      <p className="mb-3 text-sm font-semibold">Total: {formatearPrecio(cita.precioReferencial)}</p>
      <p className="mb-3 text-xs text-gray-600">
        Es una simulación académica: no se usa dinero ni tarjetas reales y no se solicita ningún dato bancario.
      </p>
      <CampoSeleccion etiqueta="Método de pago simulado" id={`metodo-${cita.id}`} value={metodo}
        opciones={METODOS} onChange={(evento) => setMetodo(evento.target.value)} />
      <div className="mb-3 flex items-center gap-2">
        <input id={`rechazo-${cita.id}`} type="checkbox" checked={simularRechazo}
          onChange={(evento) => setSimularRechazo(evento.target.checked)} />
        <label htmlFor={`rechazo-${cita.id}`} className="text-sm">Simular un pago rechazado (demostración)</label>
      </div>
      {resultado?.tipo === 'rechazado' && (
        <Mensaje tipo="error">El pago simulado fue rechazado. No se realizó ningún cobro; puedes reintentar.</Mensaje>
      )}
      {resultado?.tipo === 'error' && <Mensaje tipo="error">{resultado.texto}</Mensaje>}
      <div className="flex flex-wrap gap-2">
        <Boton disabled={procesando} onClick={confirmar}>
          {resultado?.tipo === 'rechazado' ? 'Reintentar pago' : 'Confirmar pago simulado'}
        </Boton>
        <Boton variante="suave" onClick={onCerrar}>Cerrar</Boton>
      </div>
    </section>
  );
}
