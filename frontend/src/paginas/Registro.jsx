import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoTexto } from '../components/ui/Campo.jsx';
import { Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { useAutenticacion } from '../hooks/useAutenticacion.js';
import { describirError } from '../servicios/clienteApi.js';
import {
  validarConfirmacionContrasena,
  validarContrasena,
  validarCorreo,
  validarNombre,
  validarRut,
  validarTelefono,
} from '../utils/validadores.js';

const ESTADO_INICIAL = {
  nombreCompleto: '', correo: '', contrasena: '', confirmacion: '', rut: '', telefono: '', fechaNacimiento: '',
};

function validarFormulario(valores) {
  return {
    nombreCompleto: validarNombre(valores.nombreCompleto),
    correo: validarCorreo(valores.correo),
    contrasena: validarContrasena(valores.contrasena),
    confirmacion: validarConfirmacionContrasena(valores.contrasena, valores.confirmacion),
    rut: validarRut(valores.rut),
    telefono: validarTelefono(valores.telefono),
  };
}

export default function Registro() {
  const { registrarPaciente, autenticado } = useAutenticacion();
  const navegar = useNavigate();
  const [valores, setValores] = useState(ESTADO_INICIAL);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (autenticado) {
    return <Navigate to="/mis-citas" replace />;
  }

  const manejarCambio = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = validarFormulario(valores);
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) {
      return;
    }
    setEnviando(true);
    setErrorGeneral('');
    try {
      await registrarPaciente({
        nombreCompleto: valores.nombreCompleto.trim(),
        correo: valores.correo.trim(),
        contrasena: valores.contrasena,
        rut: valores.rut.trim().toUpperCase() || null,
        telefono: valores.telefono.replace(/\D/g, '') || null,
        fechaNacimiento: valores.fechaNacimiento || null,
      });
      navegar('/mis-citas', { replace: true });
    } catch (error) {
      setErrorGeneral(describirError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-exito">Crear cuenta de paciente</h1>
        <p className="mb-4 text-sm text-gray-600">Usa datos ficticios en el entorno de demostración.</p>
        <Mensaje>{errorGeneral}</Mensaje>
        <form onSubmit={manejarEnvio} noValidate>
          <CampoTexto etiqueta="Nombre completo" id="nombreCompleto" obligatorio autoComplete="name"
            value={valores.nombreCompleto} onChange={manejarCambio} error={errores.nombreCompleto} />
          <CampoTexto etiqueta="Correo electrónico" id="correo" type="email" obligatorio autoComplete="email"
            value={valores.correo} onChange={manejarCambio} error={errores.correo} />
          <CampoTexto etiqueta="Contraseña" id="contrasena" type="password" obligatorio autoComplete="new-password"
            ayuda="Mínimo 8 caracteres con letras y números." value={valores.contrasena}
            onChange={manejarCambio} error={errores.contrasena} />
          <CampoTexto etiqueta="Confirmar contraseña" id="confirmacion" type="password" obligatorio autoComplete="new-password"
            value={valores.confirmacion} onChange={manejarCambio} error={errores.confirmacion} />
          <CampoTexto etiqueta="RUT" id="rut" placeholder="12345678-5" ayuda="Opcional."
            value={valores.rut} onChange={manejarCambio} error={errores.rut} />
          <CampoTexto etiqueta="Teléfono" id="telefono" type="tel" placeholder="9 1234 5678" ayuda="Opcional."
            value={valores.telefono} onChange={manejarCambio} error={errores.telefono} />
          <CampoTexto etiqueta="Fecha de nacimiento" id="fechaNacimiento" type="date" ayuda="Opcional."
            value={valores.fechaNacimiento} onChange={manejarCambio} />
          <Boton type="submit" className="w-full" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Registrarme'}</Boton>
        </form>
        <p className="mt-4 text-center text-sm">
          ¿Ya tienes cuenta? <Link to="/iniciar-sesion" className="font-semibold text-exito">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
