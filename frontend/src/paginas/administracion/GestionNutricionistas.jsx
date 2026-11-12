import { useState } from 'react';
import { Boton } from '../../components/ui/Boton.jsx';
import { CampoSeleccion, CampoTexto } from '../../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../../components/ui/Insignia.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useConsulta } from '../../hooks/useConsulta.js';
import { autenticacionApi } from '../../servicios/autenticacionApi.js';
import { clinicoApi } from '../../servicios/clinicoApi.js';
import { describirError } from '../../servicios/clienteApi.js';

function FormularioPerfil({ usuarios, servicios, onCreado }) {
  const [valores, setValores] = useState({ usuarioId: '', nombreCompleto: '', especialidades: '' });
  const [serviciosElegidos, setServiciosElegidos] = useState([]);
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const modificar = (evento) => setValores({ ...valores, [evento.target.id]: evento.target.value });
  const alternarServicio = (servicioId) => setServiciosElegidos(
    serviciosElegidos.includes(servicioId) ? serviciosElegidos.filter((id) => id !== servicioId) : [...serviciosElegidos, servicioId],
  );

  const crear = async (evento) => {
    evento.preventDefault();
    try {
      await clinicoApi.crearNutricionista({
        usuarioId: valores.usuarioId,
        nombreCompleto: valores.nombreCompleto,
        titulo: 'Nutricionista',
        especialidades: valores.especialidades.split(',').map((elemento) => elemento.trim()).filter(Boolean),
        serviciosIds: serviciosElegidos,
      });
      setValores({ usuarioId: '', nombreCompleto: '', especialidades: '' });
      setServiciosElegidos([]);
      setResultado({ tipo: 'exito', texto: 'Perfil de nutricionista creado' });
      onCreado();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Tarjeta titulo="Crear perfil de nutricionista">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <form onSubmit={crear}>
        <CampoSeleccion etiqueta="Usuario con rol Nutricionista" id="usuarioId" marcador="Selecciona un usuario" value={valores.usuarioId}
          onChange={modificar} opciones={usuarios.map((usuario) => ({ valor: usuario.id, etiqueta: `${usuario.nombreCompleto} (${usuario.correo})` }))} />
        <CampoTexto etiqueta="Nombre profesional" id="nombreCompleto" required value={valores.nombreCompleto} onChange={modificar} />
        <CampoTexto etiqueta="Especialidades (separadas por coma)" id="especialidades" required value={valores.especialidades} onChange={modificar} />
        <fieldset className="mb-4">
          <legend className="mb-1 text-sm font-semibold">Servicios que ofrece</legend>
          {servicios.map((servicio) => (
            <label key={servicio.id} className="mr-4 inline-flex items-center gap-1 text-sm">
              <input type="checkbox" checked={serviciosElegidos.includes(servicio.id)} onChange={() => alternarServicio(servicio.id)} />
              {servicio.nombre}
            </label>
          ))}
        </fieldset>
        <Boton type="submit">Crear perfil</Boton>
      </form>
    </Tarjeta>
  );
}

export default function GestionNutricionistas() {
  const profesionales = useConsulta(() => clinicoApi.listarNutricionistas({ soloActivos: false, tamano: 50 }));
  const usuarios = useConsulta(() => autenticacionApi.listarUsuarios({ rol: 'NUTRICIONISTA', activo: true, tamano: 100 }));
  const servicios = useConsulta(() => clinicoApi.listarServicios({ tamano: 50 }));
  const [error, setError] = useState('');

  const cambiarEstado = async (nutricionista) => {
    try {
      await clinicoApi.cambiarEstadoNutricionista(nutricionista.id, !nutricionista.activo);
      setError('');
      profesionales.recargar();
    } catch (falla) {
      setError(describirError(falla));
    }
  };

  return (
    <div className="space-y-5">
      <EstadoConsulta cargando={usuarios.cargando || servicios.cargando} error={usuarios.error || servicios.error}
        onReintentar={() => { usuarios.recargar(); servicios.recargar(); }}>
        <FormularioPerfil usuarios={usuarios.datos?.contenido ?? []} servicios={servicios.datos?.contenido ?? []}
          onCreado={profesionales.recargar} />
      </EstadoConsulta>
      <Tarjeta titulo="Nutricionistas">
        <Mensaje>{error}</Mensaje>
        <EstadoConsulta cargando={profesionales.cargando} error={profesionales.error} onReintentar={profesionales.recargar}
          vacio={profesionales.datos?.contenido.length === 0}>
          <ul className="divide-y divide-gray-100">
            {profesionales.datos?.contenido.map((nutricionista) => (
              <li key={nutricionista.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">{nutricionista.nombreCompleto}</p>
                  <p className="text-sm text-gray-500">{nutricionista.especialidades.join(', ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Insignia tipo={nutricionista.activo ? 'positivo' : 'negativo'}>{nutricionista.activo ? 'Activo' : 'Inactivo'}</Insignia>
                  <Boton variante={nutricionista.activo ? 'peligro' : 'contorno'} onClick={() => cambiarEstado(nutricionista)}>
                    {nutricionista.activo ? 'Desactivar' : 'Activar'}
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
