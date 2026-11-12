import { useState } from 'react';
import { Boton } from '../../components/ui/Boton.jsx';
import { CampoAreaTexto, CampoTexto } from '../../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../../components/ui/Insignia.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { describirError } from '../../servicios/clienteApi.js';
import { formatearPrecio } from '../../utils/formatos.js';

const VALORES_VACIOS = { nombre: '', descripcion: '', categoria: '', duracionMinutos: '30', precioReferencial: '' };

function FormularioServicio({ servicioEditado, onGuardado, onCancelar }) {
  const [valores, setValores] = useState(servicioEditado
    ? { ...servicioEditado, duracionMinutos: String(servicioEditado.duracionMinutos), precioReferencial: String(servicioEditado.precioReferencial) }
    : VALORES_VACIOS);
  const [resultado, setResultado] = useState('');

  const modificar = (evento) => setValores({ ...valores, [evento.target.id]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    const datos = {
      nombre: valores.nombre, descripcion: valores.descripcion, categoria: valores.categoria,
      duracionMinutos: Number(valores.duracionMinutos), precioReferencial: Number(valores.precioReferencial),
    };
    try {
      if (servicioEditado) {
        await clinicoApi.actualizarServicio(servicioEditado.id, datos);
      } else {
        await clinicoApi.crearServicio(datos);
      }
      onGuardado();
    } catch (falla) {
      setResultado(describirError(falla));
    }
  };

  return (
    <Tarjeta titulo={servicioEditado ? 'Editar servicio' : 'Crear servicio'}>
      <Mensaje>{resultado}</Mensaje>
      <form onSubmit={guardar} className="grid gap-x-4 md:grid-cols-2">
        <CampoTexto etiqueta="Nombre" id="nombre" required value={valores.nombre} onChange={modificar} />
        <CampoTexto etiqueta="Categoría" id="categoria" required value={valores.categoria} onChange={modificar} />
        <CampoTexto etiqueta="Duración (minutos, múltiplo de 15)" id="duracionMinutos" type="number" step="15" min="15" max="180"
          required value={valores.duracionMinutos} onChange={modificar} />
        <CampoTexto etiqueta="Precio referencial (CLP)" id="precioReferencial" type="number" min="0" required
          value={valores.precioReferencial} onChange={modificar} />
        <div className="md:col-span-2">
          <CampoAreaTexto etiqueta="Descripción" id="descripcion" required value={valores.descripcion} onChange={modificar} />
        </div>
        <div className="flex gap-2">
          <Boton type="submit">Guardar</Boton>
          {servicioEditado && <Boton variante="suave" onClick={onCancelar}>Cancelar edición</Boton>}
        </div>
      </form>
    </Tarjeta>
  );
}

export default function GestionServicios() {
  const { datos, cargando, error, recargar } = useConsulta(() => clinicoApi.listarServicios({ soloActivos: false, tamano: 50 }));
  const [servicioEditado, setServicioEditado] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  const cambiarEstado = async (servicio) => {
    try {
      await clinicoApi.cambiarEstadoServicio(servicio.id, !servicio.activo);
      setMensajeError('');
      recargar();
    } catch (falla) {
      setMensajeError(describirError(falla));
    }
  };

  return (
    <div className="space-y-5">
      <FormularioServicio key={servicioEditado?.id ?? 'nuevo'} servicioEditado={servicioEditado}
        onGuardado={() => { setServicioEditado(null); recargar(); }} onCancelar={() => setServicioEditado(null)} />
      <Tarjeta titulo="Catálogo de servicios">
        <Mensaje>{mensajeError}</Mensaje>
        <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={datos?.contenido.length === 0}>
          <ul className="divide-y divide-gray-100">
            {datos?.contenido.map((servicio) => (
              <li key={servicio.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">{servicio.nombre} <span className="text-sm font-normal text-gray-500">· {servicio.categoria}</span></p>
                  <p className="text-sm text-gray-500">{servicio.duracionMinutos} min · {formatearPrecio(servicio.precioReferencial)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Insignia tipo={servicio.activo ? 'positivo' : 'negativo'}>{servicio.activo ? 'Activo' : 'Inactivo'}</Insignia>
                  <Boton variante="suave" onClick={() => setServicioEditado(servicio)}>Editar</Boton>
                  <Boton variante={servicio.activo ? 'peligro' : 'contorno'} onClick={() => cambiarEstado(servicio)}>
                    {servicio.activo ? 'Desactivar' : 'Activar'}
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        </EstadoConsulta>
      </Tarjeta>
    </div>
  );
}
