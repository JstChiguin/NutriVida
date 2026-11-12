import { useState } from 'react';
import { CampoTexto } from '../../components/ui/Campo.jsx';
import { EstadoConsulta } from '../../components/ui/EstadoConsulta.jsx';
import { Paginador } from '../../components/ui/Paginador.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { formatearFechaHora } from '../../utils/formatos.js';

export default function Auditoria() {
  const [filtros, setFiltros] = useState({ entidad: '', operacion: '' });
  const [pagina, setPagina] = useState(0);
  const { datos, cargando, error, recargar } = useConsulta(
    () => clinicoApi.listarAuditorias({ ...filtros, pagina, tamano: 15 }), { ...filtros, pagina },
  );

  const filtrar = (evento) => {
    setFiltros({ ...filtros, [evento.target.id]: evento.target.value });
    setPagina(0);
  };

  return (
    <Tarjeta titulo="Bitácora de auditoría">
      <div className="grid gap-x-4 md:grid-cols-2">
        <CampoTexto etiqueta="Entidad" id="entidad" placeholder="citas, pacientes, usuarios…" value={filtros.entidad} onChange={filtrar} />
        <CampoTexto etiqueta="Operación" id="operacion" placeholder="CANCELAR_CITA…" value={filtros.operacion} onChange={filtrar} />
      </div>
      <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={datos?.contenido.length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-green-50 text-exito">
              <tr><th className="p-2">Fecha</th><th className="p-2">Servicio</th><th className="p-2">Entidad</th><th className="p-2">Operación</th><th className="p-2">Rol</th></tr>
            </thead>
            <tbody>
              {datos?.contenido.map((registro) => (
                <tr key={registro.id} className="border-t border-gray-100">
                  <td className="p-2">{formatearFechaHora(registro.fecha)}</td>
                  <td className="p-2">{registro.servicioOrigen}</td>
                  <td className="p-2">{registro.entidad}</td>
                  <td className="p-2">{registro.operacion}</td>
                  <td className="p-2">{registro.rol ?? 'Sistema'}</td>
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
