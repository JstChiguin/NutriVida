import { Boton } from '../ui/Boton.jsx';
import { formatearFechaHora, formatearPrecio } from '../../utils/formatos.js';

const ETIQUETAS_METODO = {
  TARJETA_SIMULADA: 'Tarjeta (simulada)',
  TRANSFERENCIA_SIMULADA: 'Transferencia (simulada)',
  EFECTIVO_SIMULADO: 'Efectivo en clínica (simulado)',
};

export default function Comprobante({ cita, pago }) {
  const { comprobante } = pago;
  return (
    <article className="comprobante rounded-lg border border-gray-300 bg-white p-4" aria-labelledby={`comprobante-${pago.id}`}>
      <h3 id={`comprobante-${pago.id}`} className="mb-2 text-lg font-bold">Comprobante de pago simulado</h3>
      <dl className="comprobante-datos mb-3 text-sm">
        <div><dt>N.º de comprobante</dt><dd>{comprobante.numero}</dd></div>
        <div><dt>Emitido</dt><dd>{formatearFechaHora(comprobante.emitidoEn)}</dd></div>
        <div><dt>Prestación</dt><dd>{cita.nombreServicio}</dd></div>
        <div><dt>Profesional</dt><dd>{cita.nombreNutricionista}</dd></div>
        <div><dt>Fecha de la cita</dt><dd>{formatearFechaHora(cita.inicio)}</dd></div>
        <div><dt>Método</dt><dd>{ETIQUETAS_METODO[pago.metodo] ?? pago.metodo}</dd></div>
        <div><dt>Monto</dt><dd>{formatearPrecio(pago.monto)}</dd></div>
      </dl>
      <p className="mb-3 text-xs font-semibold text-gray-600">{comprobante.glosa}</p>
      <Boton variante="contorno" className="no-imprimir" onClick={() => window.print()}>Imprimir comprobante</Boton>
    </article>
  );
}
