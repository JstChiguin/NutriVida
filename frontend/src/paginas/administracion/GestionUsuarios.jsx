import { Fragment, useState } from 'react';
import { Boton } from '../../components/ui/Boton.jsx';
import { CampoSeleccion, CampoTexto } from '../../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../../components/ui/EstadoConsulta.jsx';
import { Insignia } from '../../components/ui/Insignia.jsx';
import { Paginador } from '../../components/ui/Paginador.jsx';
import { Tarjeta } from '../../components/ui/Tarjeta.jsx';
import { useAutenticacion } from '../../hooks/useAutenticacion.js';
import { useConsulta } from '../../hooks/useConsulta.js';
import { autenticacionApi } from '../../servicios/autenticacionApi.js';
import { describirError } from '../../servicios/clienteApi.js';
import { ETIQUETAS_ROL } from '../../utils/formatos.js';
import { validarContrasena, validarCorreo, validarNombre } from '../../utils/validadores.js';

const OPCIONES_ROL = Object.entries(ETIQUETAS_ROL).map(([valor, etiqueta]) => ({ valor, etiqueta }));

function FormularioNuevoUsuario({ onCreado }) {
  const [valores, setValores] = useState({ nombreCompleto: '', correo: '', contrasena: '', rol: 'NUTRICIONISTA' });
  const [errores, setErrores] = useState({});
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const modificar = (evento) => setValores({ ...valores, [evento.target.id]: evento.target.value });

  const crear = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = {
      nombreCompleto: validarNombre(valores.nombreCompleto),
      correo: validarCorreo(valores.correo),
      contrasena: validarContrasena(valores.contrasena),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      return;
    }
    try {
      await autenticacionApi.crearUsuario({ ...valores, correo: valores.correo.trim() });
      setValores({ nombreCompleto: '', correo: '', contrasena: '', rol: 'NUTRICIONISTA' });
      setResultado({ tipo: 'exito', texto: 'Usuario creado' });
      onCreado();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  return (
    <Tarjeta titulo="Crear usuario">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <form onSubmit={crear} noValidate className="grid gap-x-4 md:grid-cols-2">
        <CampoTexto etiqueta="Nombre completo" id="nombreCompleto" value={valores.nombreCompleto} onChange={modificar} error={errores.nombreCompleto} />
        <CampoTexto etiqueta="Correo" id="correo" type="email" value={valores.correo} onChange={modificar} error={errores.correo} />
        <CampoTexto etiqueta="Contraseña inicial" id="contrasena" type="password" autoComplete="new-password" value={valores.contrasena}
          onChange={modificar} error={errores.contrasena} />
        <CampoSeleccion etiqueta="Rol" id="rol" opciones={OPCIONES_ROL} value={valores.rol} onChange={modificar} />
        <div><Boton type="submit">Crear usuario</Boton></div>
      </form>
    </Tarjeta>
  );
}

function FormularioEdicionUsuario({ usuario, onGuardado, onCancelar }) {
  const [valores, setValores] = useState({ nombreCompleto: usuario.nombreCompleto, correo: usuario.correo });
  const [errores, setErrores] = useState({});
  const [mensajeError, setMensajeError] = useState('');

  const modificar = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = { nombreCompleto: validarNombre(valores.nombreCompleto), correo: validarCorreo(valores.correo) };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      return;
    }
    try {
      await autenticacionApi.actualizarUsuario(usuario.id, { nombreCompleto: valores.nombreCompleto.trim(), correo: valores.correo.trim() });
      onGuardado();
    } catch (falla) {
      setMensajeError(describirError(falla));
    }
  };

  return (
    <form onSubmit={guardar} noValidate className="grid gap-x-4 bg-green-50 p-3 md:grid-cols-2" aria-label={`Editar a ${usuario.nombreCompleto}`}>
      <div className="md:col-span-2"><Mensaje>{mensajeError}</Mensaje></div>
      <CampoTexto etiqueta="Nombre completo" id={`edicion-nombre-${usuario.id}`} name="nombreCompleto" value={valores.nombreCompleto} onChange={modificar} error={errores.nombreCompleto} />
      <CampoTexto etiqueta="Correo" id={`edicion-correo-${usuario.id}`} name="correo" type="email" value={valores.correo} onChange={modificar} error={errores.correo} />
      <div className="flex gap-2">
        <Boton type="submit">Guardar cambios</Boton>
        <Boton variante="suave" onClick={onCancelar}>Cancelar</Boton>
      </div>
    </form>
  );
}

export default function GestionUsuarios() {
  const { usuario: usuarioActual } = useAutenticacion();
  const [filtros, setFiltros] = useState({ texto: '', rol: '', activo: '' });
  const [pagina, setPagina] = useState(0);
  const [resultado, setResultado] = useState({ tipo: 'error', texto: '' });
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState(null);
  const { datos, cargando, error, recargar } = useConsulta(
    () => autenticacionApi.listarUsuarios({ ...filtros, pagina, tamano: 10 }), { ...filtros, pagina },
  );

  const ejecutar = async (accion) => {
    try {
      await accion();
      setResultado({ tipo: 'error', texto: '' });
      recargar();
    } catch (falla) {
      setResultado({ tipo: 'error', texto: describirError(falla) });
    }
  };

  const filtrar = (evento) => {
    setFiltros({ ...filtros, [evento.target.id]: evento.target.value });
    setPagina(0);
  };

  return (
    <div className="space-y-5">
      <FormularioNuevoUsuario onCreado={recargar} />
      <Tarjeta titulo="Usuarios registrados">
        <div className="grid gap-x-4 md:grid-cols-3">
          <CampoTexto etiqueta="Buscar" id="texto" value={filtros.texto} onChange={filtrar} />
          <CampoSeleccion etiqueta="Rol" id="rol" marcador="Todos" opciones={OPCIONES_ROL} value={filtros.rol} onChange={filtrar} />
          <CampoSeleccion etiqueta="Estado" id="activo" marcador="Todos" value={filtros.activo} onChange={filtrar}
            opciones={[{ valor: 'true', etiqueta: 'Activos' }, { valor: 'false', etiqueta: 'Inactivos' }]} />
        </div>
        <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
        <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar} vacio={datos?.contenido.length === 0}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-green-50 text-exito">
                <tr><th className="p-2">Nombre</th><th className="p-2">Correo</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr>
              </thead>
              <tbody>
                {datos?.contenido.map((usuario) => (
                  <Fragment key={usuario.id}>
                  <tr className="border-t border-gray-100">
                    <td className="p-2 font-semibold">{usuario.nombreCompleto}</td>
                    <td className="p-2">{usuario.correo}</td>
                    <td className="p-2">
                      <select aria-label={`Rol de ${usuario.nombreCompleto}`} value={usuario.rol} className="rounded border border-gray-300 px-1 py-0.5"
                        disabled={usuario.id === usuarioActual.id}
                        onChange={(evento) => ejecutar(() => autenticacionApi.cambiarRolUsuario(usuario.id, evento.target.value))}>
                        {OPCIONES_ROL.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                      </select>
                    </td>
                    <td className="p-2"><Insignia tipo={usuario.activo ? 'positivo' : 'negativo'}>{usuario.activo ? 'Activo' : 'Inactivo'}</Insignia></td>
                    <td className="flex gap-2 p-2">
                      <Boton variante="suave" onClick={() => setUsuarioEnEdicion(usuario.id)}>Editar</Boton>
                      <Boton variante={usuario.activo ? 'peligro' : 'contorno'} disabled={usuario.id === usuarioActual.id}
                        onClick={() => ejecutar(() => autenticacionApi.cambiarEstadoUsuario(usuario.id, !usuario.activo))}>
                        {usuario.activo ? 'Desactivar' : 'Activar'}
                      </Boton>
                    </td>
                  </tr>
                  {usuarioEnEdicion === usuario.id && (
                    <tr>
                      <td colSpan={5}>
                        <FormularioEdicionUsuario usuario={usuario} onCancelar={() => setUsuarioEnEdicion(null)}
                          onGuardado={() => { setUsuarioEnEdicion(null); setResultado({ tipo: 'exito', texto: 'Usuario actualizado' }); recargar(); }} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={pagina} totalPaginas={datos?.totalPaginas} onCambiar={setPagina} />
        </EstadoConsulta>
      </Tarjeta>
    </div>
  );
}
