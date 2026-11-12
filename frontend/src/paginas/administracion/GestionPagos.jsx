import { useState } from 'react';
import { Boton } from '../../components/ui/Boton.jsx';
import { CampoSeleccion } from '../../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../../components/ui/Insignia.jsx';
import { Paginador } from '../../components/ui/Paginador.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { agendaApi } from '../../servicios/agendaApi.js';
import { describirError } from '../../servicios/clienteApi.js';
import { formatearFechaHora, formatearPrecio } from '../../utils/formatos.js';

const ETIQUETAS_ESTADO_PAGO = {
  APROBADO_SIMULADO: 'Aprobado (simulado)',
  RECHAZADO_SIMULADO: 'Rechazado (simulado)',
  ANULADO: 'Anulado',
};
const OPCIONES_ESTADO = Object.entries(ETIQUETAS_ESTADO_PAGO).map(([valor, etiqueta]) => ({ valor, etiqueta }));
const TIPO_INSIGNIA = { APROBADO_SIMULADO: 'positivo', RECHAZADO_SIMULADO: 'negativo', ANULADO: 'neutro' };

export default function GestionPagos() {
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(0);
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });
  const { datos, cargando, error, recargar } = useConsulta(
    () => agendaApi.listarPagos({ estado, pagina, tamano: 10 }), { estado, pagina },
  );

  const anular = async (pagoId) => {
    try {
      await agendaApi.anularPago(pagoId);
      setResultado({ tipo: 'exito', texto: 'Pago simulado anulado' });
      recargar();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Tarjeta titulo="Pagos simulados">
      <p className="mb-4 text-sm text-gray-600">Todos los pagos son simulados: no existe cobro real ni datos de tarjeta.</p>
      <div className="max-w-xs">
        <CampoSeleccion etiqueta="Estado" id="estado-pago" marcador="Todos" opciones={OPCIONES_ESTADO} value={estado}
          onChange={(evento) => { setEstado(evento.target.value); setPagina(0); }} />
      </div>
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={datos?.contenido.length === 0}
        mensajeVacio="No hay pagos registrados.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-green-50 text-exito">
              <tr><th className="p-2">Fecha</th><th className="p-2">Comprobante</th><th className="p-2">Monto</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr>
            </thead>
            <tbody>
              {datos?.contenido.map((pago) => (
                <tr key={pago.id} className="border-t border-gray-100">
                  <td className="p-2">{formatearFechaHora(pago.creadoEn)}</td>
                  <td className="p-2">{pago.comprobante?.numero}</td>
                  <td className="p-2">{formatearPrecio(pago.monto)}</td>
                  <td className="p-2"><Insignia tipo={TIPO_INSIGNIA[pago.estado]}>{ETIQUETAS_ESTADO_PAGO[pago.estado]}</Insignia></td>
                  <td className="p-2">
                    {pago.estado === 'APROBADO_SIMULADO' && (
                      <Boton variante="peligro" aria-label={`Anular pago ${pago.comprobante?.numero}`} onClick={() => anular(pago.id)}>Anular</Boton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginador pagina={pagina} totalPaginas={datos?.totalPaginas} onCambiar={setPagina} />
      </EstadoConsulta>
    </Tarjeta>
  );
}
