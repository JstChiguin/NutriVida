import { useState, useRef } from 'react';
import {
  validarNombre,
  validarCorreo,
  validarTelefono,
  validarMotivo,
  validarMensaje,
  validarPrivacidad,
} from '../../utils/validadores.js';

const etiquetasMotivo = {
  consulta_inicial: 'Primera Consulta Nutricional (50 min)',
  perdida_peso: 'Plan Pérdida de Peso (1 o 3 meses)',
  metabolica: 'Control Diabetes / Hipertensión',
  deportiva: 'Nutrición Deportiva y Rendimiento',
  vegetariana_vegana: 'Alimentación Vegetariana / Vegana',
  infantil: 'Nutrición Infantil (2 a 12 años)',
  evaluacion: 'Evaluación Corporal (Bioimpedancia / Antropometría)',
  general: 'Consulta General y Horarios de Atención',
};

const estadoInicial = {
  nombre: '',
  correo: '',
  telefono: '',
  motivo: '',
  mensaje: '',
  privacidad: false,
};

export default function Contacto() {
  const [valores, setValores] = useState(estadoInicial);
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [datosConfirmados, setDatosConfirmados] = useState(null);

  const refNombre = useRef(null);
  const refCorreo = useRef(null);
  const refTelefono = useRef(null);
  const refMotivo = useRef(null);
  const refMensaje = useRef(null);
  const refPrivacidad = useRef(null);

  const validarUnCampo = (nombreCampo, valor) => {
    switch (nombreCampo) {
      case 'nombre':
        return validarNombre(valor);
      case 'correo':
        return validarCorreo(valor);
      case 'telefono':
        return validarTelefono(valor);
      case 'motivo':
        return validarMotivo(valor);
      case 'mensaje':
        return validarMensaje(valor);
      case 'privacidad':
        return validarPrivacidad(valor);
      default:
        return null;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nuevoValor = type === 'checkbox' ? checked : value;

    setValores((prev) => ({
      ...prev,
      [name]: nuevoValor,
    }));

    if (tocados[name] || type === 'checkbox' || name === 'motivo') {
      const error = validarUnCampo(name, nuevoValor);
      setErrores((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTocados((prev) => ({ ...prev, [name]: true }));

    const valor = valores[name];
    if (valor !== '' || name !== 'telefono') {
      const error = validarUnCampo(name, valor);
      setErrores((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nuevosErrores = {
      nombre: validarNombre(valores.nombre),
      correo: validarCorreo(valores.correo),
      telefono: validarTelefono(valores.telefono),
      motivo: validarMotivo(valores.motivo),
      mensaje: validarMensaje(valores.mensaje),
      privacidad: validarPrivacidad(valores.privacidad),
    };

    setErrores(nuevosErrores);
    setTocados({
      nombre: true,
      correo: true,
      telefono: true,
      motivo: true,
      mensaje: true,
      privacidad: true,
    });

    const ordenCampos = ['nombre', 'correo', 'telefono', 'motivo', 'mensaje', 'privacidad'];
    const primerErrorCampo = ordenCampos.find((campo) => Boolean(nuevosErrores[campo]));

    if (primerErrorCampo) {
      const referencias = {
        nombre: refNombre,
        correo: refCorreo,
        telefono: refTelefono,
        motivo: refMotivo,
        mensaje: refMensaje,
        privacidad: refPrivacidad,
      };

      referencias[primerErrorCampo]?.current?.focus();
      return;
    }

    setDatosConfirmados({ ...valores });
    setEnviadoExitoso(true);
  };

  const handleReset = () => {
    setValores(estadoInicial);
    setErrores({});
    setTocados({});
    setEnviadoExitoso(false);
    setDatosConfirmados(null);
  };

  const obtenerClaseInput = (nombreCampo) => {
    const tieneError = Boolean(errores[nombreCampo]);
    const fueTocado = Boolean(tocados[nombreCampo]);
    const valor = valores[nombreCampo];
    const tieneValor = typeof valor === 'boolean' ? valor : Boolean(valor && valor.trim().length > 0);

    let clases = 'control-formulario';
    if (fueTocado && tieneError) {
      clases += ' is-invalid';
    } else if (fueTocado && !tieneError && tieneValor) {
      clases += ' is-valid';
    }
    return clases;
  };

  return (
    <section id="contacto" className="bg-light">
      <div className="portada text-white" style={{ backgroundColor: 'var(--color-portada, #81C784)' }}>
        <div className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 text-center portada-contenido">
              <h1 className="display-5 fw-bold mb-3">Contáctanos</h1>
              <p className="lead mb-2">¿Tienes dudas sobre nuestros servicios nutricionales o necesitas orientación?</p>
              <p className="mb-0">Estamos aquí para responder tus consultas y acompañar tu proceso.</p>
            </div>
          </div>
        </div>
      </div>

      <main className="seccion-contacto mx-auto w-full max-w-[64rem] px-4 py-6 sm:px-6 sm:py-8" aria-labelledby="titulo-contacto">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="formulario-contacto card shadow-sm border-0 rounded-4 p-4 p-md-5 bg-white">
          {!enviadoExitoso ? (
            <>
              <div id="intro-contacto" className="introduccion-contacto">
                <h2 id="titulo-contacto" className="titulo-contacto">
                  Formulario de Consulta
                </h2>
                <p className="texto-introduccion">
                  Por favor completa el siguiente formulario. Los campos marcados con{' '}
                  <span className="campo-obligatorio" aria-hidden="true">*</span> son obligatorios.
                </p>
              </div>

              <form id="formulario-contacto" onSubmit={handleSubmit} noValidate>
                <div className="grupo-formulario">
                  <label htmlFor="nombre">
                    Nombre completo <span className="campo-obligatorio" aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={refNombre}
                    type="text"
                    id="nombre"
                    name="nombre"
                    className={obtenerClaseInput('nombre')}
                    maxLength="50"
                    placeholder="Ingresa tu nombre y apellido"
                    value={valores.nombre}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-describedby="error-nombre"
                    autoComplete="name"
                  />
                  <p id="error-nombre" className="error" role="alert">
                    {errores.nombre || ''}
                  </p>
                </div>

                <div className="grupo-formulario">
                  <label htmlFor="correo">
                    Correo electrónico <span className="campo-obligatorio" aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={refCorreo}
                    type="email"
                    id="correo"
                    name="correo"
                    className={obtenerClaseInput('correo')}
                    placeholder="ejemplo@correo.cl"
                    value={valores.correo}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                    aria-describedby="error-correo"
                  />
                  <p id="error-correo" className="error" role="alert">
                    {errores.correo || ''}
                  </p>
                </div>

                <div className="grupo-formulario">
                  <label htmlFor="telefono">Teléfono celular</label>
                  <input
                    ref={refTelefono}
                    type="tel"
                    id="telefono"
                    name="telefono"
                    className={obtenerClaseInput('telefono')}
                    placeholder="Ej: 9 1234 5678 (opcional)"
                    value={valores.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="tel"
                    inputMode="tel"
                    aria-describedby="hint-telefono error-telefono"
                  />
                  <p id="hint-telefono" className="hint">
                    Opcional. Formato chileno de 9 dígitos para coordinar por llamada o WhatsApp.
                  </p>
                  <p id="error-telefono" className="error" role="alert">
                    {errores.telefono || ''}
                  </p>
                </div>

                <div className="grupo-formulario">
                  <label htmlFor="motivo">
                    Motivo de consulta <span className="campo-obligatorio" aria-hidden="true">*</span>
                  </label>
                  <select
                    ref={refMotivo}
                    id="motivo"
                    name="motivo"
                    className={obtenerClaseInput('motivo')}
                    value={valores.motivo}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-describedby="error-motivo"
                  >
                    <option value="">-- Selecciona el motivo de tu consulta --</option>
                    <option value="consulta_inicial">Primera Consulta Nutricional (50 min)</option>
                    <option value="perdida_peso">Plan Pérdida de Peso (1 o 3 meses)</option>
                    <option value="metabolica">Control Diabetes / Hipertensión</option>
                    <option value="deportiva">Nutrición Deportiva y Rendimiento</option>
                    <option value="vegetariana_vegana">Alimentación Vegetariana / Vegana</option>
                    <option value="infantil">Nutrición Infantil (2 a 12 años)</option>
                    <option value="evaluacion">Evaluación Corporal (Bioimpedancia / Antropometría)</option>
                    <option value="general">Consulta General y Horarios de Atención</option>
                  </select>
                  <p id="error-motivo" className="error" role="alert">
                    {errores.motivo || ''}
                  </p>
                </div>

                <div className="grupo-formulario">
                  <label htmlFor="mensaje">
                    Mensaje <span className="campo-obligatorio" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    ref={refMensaje}
                    id="mensaje"
                    name="mensaje"
                    className={obtenerClaseInput('mensaje')}
                    rows="4"
                    maxLength="600"
                    placeholder="Cuéntanos tus metas, dudas o motivo de consulta (mínimo 15 caracteres)..."
                    value={valores.mensaje}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-describedby="hint-mensaje error-mensaje"
                  />
                  <p id="hint-mensaje" className="hint">
                    Entre 15 y 600 caracteres.
                  </p>
                  <p id="error-mensaje" className="error" role="alert">
                    {errores.mensaje || ''}
                  </p>
                </div>

                <div className="grupo-formulario">
                  <div className="grupo-checkbox">
                    <input
                      ref={refPrivacidad}
                      type="checkbox"
                      id="privacidad"
                      name="privacidad"
                      checked={valores.privacidad}
                      onChange={handleChange}
                      className={tocados.privacidad && errores.privacidad ? 'is-invalid' : ''}
                      aria-describedby="error-privacidad"
                    />
                    <label htmlFor="privacidad">
                      Acepto el uso y tratamiento confidencial de mis datos con fines de contacto clínico
                      según la política de privacidad de salud{' '}
                      <span className="campo-obligatorio" aria-hidden="true">*</span>
                    </label>
                  </div>
                  <p id="error-privacidad" className="error" role="alert">
                    {errores.privacidad || ''}
                  </p>
                </div>

                <div className="grupo-formulario grupo-envio">
                  <button type="submit" className="boton-enviar">
                    Enviar Mensaje
                  </button>
                </div>
              </form>
            </>
          ) : (
            <section id="panel-exito" className="panel-exito" tabIndex="-1" aria-live="polite">
              <div className="icono-exito">🌿</div>
              <h3>¡Mensaje recibido con éxito!</h3>
              <p>
                Muchas gracias, <strong>{datosConfirmados?.nombre}</strong>. Hemos registrado tu
                consulta para el área de{' '}
                <strong>
                  {etiquetasMotivo[datosConfirmados?.motivo] || 'Consulta Nutricional'}
                </strong>.
              </p>

              <div className="resumen-exito">
                <p><strong>Detalle de contacto registrado:</strong></p>
                <p>📧 Respuesta dirigida a: <span>{datosConfirmados?.correo}</span></p>
                {datosConfirmados?.telefono && (
                  <p>📞 Teléfono: {datosConfirmados.telefono}</p>
                )}
                <p>🕒 Tiempo estimado de respuesta: Dentro de 24 horas hábiles.</p>
                <p>🏥 Ubicación: Av. Brasil 2021, Valparaíso (o mediante teleconsulta).</p>
              </div>

              <p className="texto-panel-exito">
                Un nutricionista de nuestro equipo revisará tu mensaje para coordinar tu atención.
              </p>
              <button
                type="button"
                id="btn-nuevo-mensaje"
                className="boton-reiniciar"
                onClick={handleReset}
              >
                Enviar otra consulta
              </button>
            </section>
          )}
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}

