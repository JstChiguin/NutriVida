import { useState } from 'react';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoAreaTexto, CampoSeleccion, CampoTexto } from '../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import Contenedor from '../components/layout/Contenedor.jsx';
import { useAutenticacion } from '../hooks/useAutenticacion.js';
import { useConsulta } from '../hooks/useConsulta.js';
import { autenticacionApi } from '../servicios/autenticacionApi.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { ETIQUETAS_ROL } from '../utils/formatos.js';
import { validarConfirmacionContrasena, validarContrasena, validarNombre, validarRut, validarTelefono } from '../utils/validadores.js';

const OPCIONES_SEXO = [
  { valor: 'FEMENINO', etiqueta: 'Femenino' },
  { valor: 'MASCULINO', etiqueta: 'Masculino' },
  { valor: 'OTRO', etiqueta: 'Otro' },
  { valor: 'NO_INFORMA', etiqueta: 'Prefiero no informar' },
];

function FormularioPerfilPaciente({ perfil }) {
  const [valores, setValores] = useState({
    nombreCompleto: perfil.nombreCompleto, rut: perfil.rut ?? '', telefono: perfil.telefono ?? '',
    fechaNacimiento: perfil.fechaNacimiento ?? '', sexo: perfil.sexo ?? '', direccion: perfil.direccion ?? '',
  });
  const [errores, setErrores] = useState({});
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const manejarCambio = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = {
      nombreCompleto: validarNombre(valores.nombreCompleto),
      rut: validarRut(valores.rut),
      telefono: validarTelefono(valores.telefono),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      return;
    }
    try {
      await clinicoApi.actualizarMiPerfilPaciente({
        nombreCompleto: valores.nombreCompleto.trim(),
        rut: valores.rut.trim().toUpperCase() || null,
        telefono: valores.telefono.replace(/\D/g, '') || null,
        fechaNacimiento: valores.fechaNacimiento || null,
        sexo: valores.sexo || null,
        direccion: valores.direccion || null,
      });
      setResultado({ tipo: 'exito', texto: 'Datos actualizados correctamente' });
    } catch (error) {
      setResultado({ tipo: 'error', texto: describirError(error) });
    }
  };

  return (
    <Tarjeta titulo="Mis datos personales">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <form onSubmit={guardar} noValidate>
        <CampoTexto etiqueta="Nombre completo" id="nombreCompleto" value={valores.nombreCompleto}
          onChange={manejarCambio} error={errores.nombreCompleto} />
        <CampoTexto etiqueta="RUT" id="rut" value={valores.rut} onChange={manejarCambio} error={errores.rut} />
        <CampoTexto etiqueta="Teléfono" id="telefono" type="tel" value={valores.telefono}
          onChange={manejarCambio} error={errores.telefono} />
        <CampoTexto etiqueta="Fecha de nacimiento" id="fechaNacimiento" type="date" value={valores.fechaNacimiento}
          onChange={manejarCambio} />
        <CampoSeleccion etiqueta="Sexo" id="sexo" marcador="Sin especificar" opciones={OPCIONES_SEXO}
          value={valores.sexo} onChange={manejarCambio} />
        <CampoTexto etiqueta="Dirección" id="direccion" value={valores.direccion} onChange={manejarCambio} />
        <Boton type="submit">Guardar cambios</Boton>
      </form>
    </Tarjeta>
  );
}

function FormularioContrasena() {
  const [valores, setValores] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [errores, setErrores] = useState({});
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const manejarCambio = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  const cambiar = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = {
      actual: valores.actual ? null : 'Ingresa tu contraseña actual',
      nueva: validarContrasena(valores.nueva),
      confirmacion: validarConfirmacionContrasena(valores.nueva, valores.confirmacion),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      return;
    }
    try {
      await autenticacionApi.cambiarContrasena(valores.actual, valores.nueva);
      setValores({ actual: '', nueva: '', confirmacion: '' });
      setResultado({ tipo: 'exito', texto: 'Contraseña actualizada' });
    } catch (error) {
      setResultado({ tipo: 'error', texto: describirError(error) });
    }
  };

  return (
    <Tarjeta titulo="Cambiar contraseña">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <form onSubmit={cambiar} noValidate>
        <CampoTexto etiqueta="Contraseña actual" id="actual" type="password" autoComplete="current-password"
          value={valores.actual} onChange={manejarCambio} error={errores.actual} />
        <CampoTexto etiqueta="Contraseña nueva" id="nueva" type="password" autoComplete="new-password"
          value={valores.nueva} onChange={manejarCambio} error={errores.nueva} />
        <CampoTexto etiqueta="Confirmar contraseña nueva" id="confirmacion" type="password" autoComplete="new-password"
          value={valores.confirmacion} onChange={manejarCambio} error={errores.confirmacion} />
        <Boton type="submit">Actualizar contraseña</Boton>
      </form>
    </Tarjeta>
  );
}

function DatosPaciente() {
  const { datos, cargando, error, recargar } = useConsulta(() => clinicoApi.consultarMiPerfilPaciente());
  return (
    <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar}>
      {datos && <FormularioPerfilPaciente perfil={datos} />}
    </EstadoConsulta>
  );
}

function FormularioPerfilNutricionista({ perfil }) {
  const [valores, setValores] = useState({
    nombreCompleto: perfil.nombreCompleto, titulo: perfil.titulo ?? '',
    especialidades: perfil.especialidades.join(', '), biografia: perfil.biografia ?? '',
  });
  const [errores, setErrores] = useState({});
  const [resultado, setResultado] = useState({ tipo: 'exito', texto: '' });

  const manejarCambio = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    const especialidades = valores.especialidades.split(',').map((elemento) => elemento.trim()).filter(Boolean);
    const nuevosErrores = {
      nombreCompleto: validarNombre(valores.nombreCompleto),
      especialidades: especialidades.length === 0 ? 'Indica al menos una especialidad' : null,
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      return;
    }
    try {
      await clinicoApi.actualizarMiPerfilNutricionista({
        nombreCompleto: valores.nombreCompleto.trim(),
        titulo: valores.titulo.trim() || null,
        especialidades,
        biografia: valores.biografia.trim() || null,
        fotoUrl: perfil.fotoUrl ?? null,
        serviciosIds: perfil.serviciosIds,
      });
      setResultado({ tipo: 'exito', texto: 'Perfil profesional actualizado' });
    } catch (error) {
      setResultado({ tipo: 'error', texto: describirError(error) });
    }
  };

  return (
    <Tarjeta titulo="Mi perfil profesional">
      <Mensaje tipo={resultado.tipo}>{resultado.texto}</Mensaje>
      <form onSubmit={guardar} noValidate>
        <CampoTexto etiqueta="Nombre profesional" id="nombreCompleto" value={valores.nombreCompleto}
          onChange={manejarCambio} error={errores.nombreCompleto} />
        <CampoTexto etiqueta="Título" id="titulo" value={valores.titulo} onChange={manejarCambio} />
        <CampoTexto etiqueta="Especialidades (separadas por coma)" id="especialidades" value={valores.especialidades}
          onChange={manejarCambio} error={errores.especialidades} />
        <CampoAreaTexto etiqueta="Presentación" id="biografia" maxLength="1000" value={valores.biografia} onChange={manejarCambio} />
        <Boton type="submit">Guardar perfil</Boton>
      </form>
    </Tarjeta>
  );
}

function DatosNutricionista() {
  const { datos, cargando, error, recargar } = useConsulta(() => clinicoApi.consultarMiPerfilNutricionista());
  return (
    <EstadoConsulta cargando={cargando} error={error} onReintentar={recargar}>
      {datos && <FormularioPerfilNutricionista perfil={datos} />}
    </EstadoConsulta>
  );
}

export default function Perfil() {
  const { usuario } = useAutenticacion();

  return (
    <Contenedor titulo="Mi perfil" descripcion={`${usuario.nombreCompleto} · ${ETIQUETAS_ROL[usuario.rol]} · ${usuario.correo}`}>
      <div className="grid gap-5 md:grid-cols-2">
        {usuario.rol === 'PACIENTE' && <DatosPaciente />}
        {usuario.rol === 'NUTRICIONISTA' && <DatosNutricionista />}
        <FormularioContrasena />
      </div>
    </Contenedor>
  );
}
