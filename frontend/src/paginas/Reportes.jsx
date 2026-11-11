import { useState } from 'react';
import Contenedor from '../components/layout/Contenedor.jsx';
import { CampoTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta } from '../components/ui/EstadoConsulta.jsx';
import { GraficoBarras } from '../components/ui/GraficoBarras.jsx';
import { GraficoLineas } from '../components/ui/GraficoLineas.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import { useConsulta } from '../hooks/useConsulta.js';
import { agendaApi } from '../servicios/agendaApi.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { ETIQUETAS_ESTADO_CITA, convertirFechaAInstante } from '../utils/formatos.js';

async function cargarReportes(parametros) {
  const [citasPorEstado, servicios, actividad, atenciones, eventos, atendidos, pacientes] = await Promise.all([
    agendaApi.contarCitasPorEstado(parametros),
    agendaApi.listarServiciosMasSolicitados(parametros),
    agendaApi.resumirActividadPorDia(parametros),
    agendaApi.resumirAtencionesPorNutricionista(parametros),
    agendaApi.contarEventosDeCitas(parametros),
    agendaApi.contarPacientesAtendidos(parametros),
    clinicoApi.resumirPacientes(parametros),
  ]);
  return { citasPorEstado, servicios, actividad, atenciones, eventos, atendidos, pacientes };
}

function Indicador({ etiqueta, valor }) {
  return (
    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
      <dt className="text-sm text-gray-500">{etiqueta}</dt>
      <dd className="text-3xl font-bold text-exito">{valor}</dd>
    </div>
  );
}

export default function Reportes() {
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const parametros = { desde: convertirFechaAInstante(rango.desde), hasta: convertirFechaAInstante(rango.hasta, true) };
  const { datos, cargando, error, recargar } = useConsulta(() => cargarReportes(parametros), rango);

  const modificar = (evento) => setRango({ ...rango, [evento.target.id]: evento.target.value });

  return (
    <Contenedor titulo="Reportes e indicadores" descripcion="Indicadores agregados sin datos personales ni clínicos.">
      <div className="grid gap-x-4 md:grid-cols-2">
        <CampoTexto etiqueta="Desde" id="desde" type="date" value={rango.desde} onChange={modificar} />
        <CampoTexto etiqueta="Hasta" id="hasta" type="date" value={rango.hasta} onChange={modificar} />
      </div>
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar}>
        {datos && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Indicador etiqueta="Pacientes registrados" valor={datos.pacientes.totalRegistrados} />
              <Indicador etiqueta="Pacientes activos" valor={datos.pacientes.activos} />
              <Indicador etiqueta="Pacientes atendidos" valor={datos.atendidos.pacientes} />
              <Indicador etiqueta="Atenciones realizadas" valor={datos.atendidos.atenciones} />
            </dl>
            <div className="grid gap-5 lg:grid-cols-2">
              <Tarjeta titulo="Citas por estado">
                <GraficoBarras titulo="Citas por estado"
                  datos={datos.citasPorEstado.map((fila) => ({ etiqueta: ETIQUETAS_ESTADO_CITA[fila.estado] ?? fila.estado, valor: fila.cantidad }))} />
              </Tarjeta>
              <Tarjeta titulo="Servicios más solicitados">
                <GraficoBarras titulo="Servicios más solicitados"
                  datos={datos.servicios.map((fila) => ({ etiqueta: fila.nombreServicio, valor: fila.solicitudes }))} />
              </Tarjeta>
              <Tarjeta titulo="Actividad de la agenda por día">
                <GraficoLineas titulo="Citas por día"
                  puntos={datos.actividad.map((fila) => ({ etiqueta: fila.fecha.slice(5), valor: fila.citas }))} />
              </Tarjeta>
              <Tarjeta titulo="Eventos del historial de citas">
                <GraficoBarras titulo="Eventos del historial"
                  datos={datos.eventos.map((fila) => ({ etiqueta: fila.evento, valor: fila.cantidad }))} />
              </Tarjeta>
            </div>
            <Tarjeta titulo="Atenciones por nutricionista">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-green-50 text-exito">
                    <tr><th className="p-2">Profesional</th><th className="p-2">Total</th><th className="p-2">Realizadas</th><th className="p-2">Inasistencias</th><th className="p-2">Canceladas</th></tr>
                  </thead>
                  <tbody>
                    {datos.atenciones.map((fila) => (
                      <tr key={fila.nutricionistaId} className="border-t border-gray-100">
                        <td className="p-2 font-semibold">{fila.nombreNutricionista}</td>
                        <td className="p-2">{fila.total}</td>
                        <td className="p-2">{fila.realizadas}</td>
                        <td className="p-2">{fila.inasistencias}</td>
                        <td className="p-2">{fila.canceladas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          </div>
        )}
      </EstadoConsulta>
    </Contenedor>
  );
}
