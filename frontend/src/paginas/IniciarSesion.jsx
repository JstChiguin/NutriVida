import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoTexto } from '../components/ui/Campo.jsx';
import { Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { useAutenticacion } from '../hooks/useAutenticacion.js';
import { describirError } from '../servicios/clienteApi.js';
import { validarCorreo } from '../utils/validadores.js';

const RUTA_INICIAL_POR_ROL = {
  PACIENTE: '/mis-citas',
  NUTRICIONISTA: '/agenda',
  ADMINISTRADOR: '/administracion',
};

export default function IniciarSesion() {
  const { iniciarSesion, autenticado, usuario } = useAutenticacion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [valores, setValores] = useState({ correo: '', contrasena: '' });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (autenticado) {
    return <Navigate to={ubicacion.state?.desde ?? RUTA_INICIAL_POR_ROL[usuario.rol]} replace />;
  }

  const manejarCambio = (evento) => setValores({ ...valores, [evento.target.name]: evento.target.value });

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    const nuevosErrores = {
      correo: validarCorreo(valores.correo),
      contrasena: valores.contrasena ? null : 'La contraseña es obligatoria',
    };
    setErrores(nuevosErrores);
    if (nuevosErrores.correo || nuevosErrores.contrasena) {
      return;
    }
    setEnviando(true);
    setErrorGeneral('');
    try {
      const sesion = await iniciarSesion(valores.correo.trim(), valores.contrasena);
      navegar(ubicacion.state?.desde ?? RUTA_INICIAL_POR_ROL[sesion.rol], { replace: true });
    } catch (error) {
      setErrorGeneral(describirError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-exito">Iniciar sesión</h1>
        <Mensaje>{errorGeneral}</Mensaje>
        <form onSubmit={manejarEnvio} noValidate>
          <CampoTexto etiqueta="Correo electrónico" id="correo" type="email" autoComplete="email" obligatorio
            value={valores.correo} onChange={manejarCambio} error={errores.correo} />
          <CampoTexto etiqueta="Contraseña" id="contrasena" type="password" autoComplete="current-password" obligatorio
            value={valores.contrasena} onChange={manejarCambio} error={errores.contrasena} />
          <Boton type="submit" className="w-full" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</Boton>
        </form>
        <p className="mt-4 text-center text-sm">
          ¿Aún no tienes cuenta? <Link to="/registro" className="font-semibold text-exito">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
