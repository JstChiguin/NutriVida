import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SelectorHorario from '../components/citas/SelectorHorario.jsx';
import Layout, { ResumenServicios } from '../components/layout/Layout.jsx';
import { Boton } from '../components/ui/Boton.jsx';
import { CampoAreaTexto, CampoSeleccion } from '../components/ui/Campo.jsx';
import { EstadoConsulta, Mensaje } from '../components/ui/EstadoConsulta.jsx';
import { Tarjeta } from '../components/ui/Tarjeta.jsx';
import { useConsulta } from '../hooks/useConsulta.js';
import { agendaApi } from '../servicios/agendaApi.js';
import { clinicoApi } from '../servicios/clinicoApi.js';
import { describirError } from '../servicios/clienteApi.js';
import { formatearFechaHora, formatearPrecio } from '../utils/formatos.js';
import { consultarTodasLasPaginas } from '../utils/paginacion.js';

export default function SolicitarCita() {
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const nutricionistaIdInicial = parametros.get('nutricionistaId') ?? '';
  const [servicioId, setServicioId] = useState(parametros.get('servicioId') ?? '');
  const [nutricionistaId, setNutricionistaId] = useState(nutricionistaIdInicial);
  const [profesionalFijado, setProfesionalFijado] = useState(Boolean(nutricionistaIdInicial));
  const [profesionalElegido, setProfesionalElegido] = useState(null);
  const [inicio, setInicio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);

  const servicios = useConsulta(() => consultarTodasLasPaginas(clinicoApi.listarServicios));
  const profesionalInicial = useConsulta(
    () => (nutricionistaIdInicial ? clinicoApi.consultarNutricionista(nutricionistaIdInicial) : Promise.resolve(null)),
    { nutricionistaIdInicial },
  );
  const profesionalesDelServicio = useConsulta(
    () => (servicioId ? consultarTodasLasPaginas(clinicoApi.listarNutricionistas, { servicioId }) : Promise.resolve([])),
    { servicioId },
  );

  const servicio = servicios.datos?.find((candidato) => candidato.id === servicioId);
  const listaDelServicio = profesionalesDelServicio.datos ?? [];
  const profesionalEnServicio = listaDelServicio.some((candidato) => candidato.id === nutricionistaId);

  const preseleccionValida = Boolean(profesionalInicial.datos) && profesionalInicial.datos.activo !== false;
  const preseleccionInvalida = profesionalFijado && !profesionalInicial.cargando && !preseleccionValida;
  const fijadoVigente = profesionalFijado && preseleccionValida;
  const servicioIncompatible = fijadoVigente && Boolean(servicioId) && !profesionalesDelServicio.cargando
    && !profesionalesDelServicio.error && !profesionalEnServicio;

  const nutricionistaParaReserva = servicioId && profesionalEnServicio && !preseleccionInvalida ? nutricionistaId : '';
  const nombreProfesional = fijadoVigente
    ? profesionalInicial.datos.nombreCompleto
    : listaDelServicio.find((candidato) => candidato.id === nutricionistaId)?.nombreCompleto
      ?? (profesionalElegido?.id === nutricionistaId ? profesionalElegido.nombreCompleto : undefined);
  const mostrarProfesional = fijadoVigente || (Boolean(nutricionistaId) && !preseleccionInvalida
    && (!servicioId || profesionalesDelServicio.cargando || profesionalEnServicio));

  const seleccionarServicio = (evento) => {
    setServicioId(evento.target.value);
    setInicio('');
  };

  const seleccionarProfesional = (evento) => {
    const elegido = listaDelServicio.find((candidato) => candidato.id === evento.target.value);
    setNutricionistaId(evento.target.value);
    setProfesionalElegido(elegido ?? null);
    setProfesionalFijado(false);
    setInicio('');
  };

  const cambiarProfesional = () => {
    setProfesionalElegido(profesionalInicial.datos ?? null);
    setProfesionalFijado(false);
    setInicio('');
  };

  const elegirOtroServicio = () => {
    setServicioId('');
    setInicio('');
  };

  const quitarDelResumen = (elemento) => {
    if (elemento.clave === 'profesional') {
      setNutricionistaId('');
      setProfesionalElegido(null);
      setProfesionalFijado(false);
    }
    if (elemento.clave === 'servicio') {
      setServicioId('');
    }
    setInicio('');
  };

  const enviar = async (evento) => {
    evento.preventDefault();
    if (motivo.trim().length < 5) {
      setErrorMotivo('Describe brevemente el motivo de tu consulta (mínimo 5 caracteres)');
      return;
    }
    setErrorMotivo('');
    setEnviando(true);
    setErrorEnvio('');
    try {
      await agendaApi.solicitarCita({
        nutricionistaId: nutricionistaParaReserva, servicioId, inicio, motivoConsulta: motivo.trim(),
      });
      navegar('/mis-citas', { state: { mensaje: 'Solicitud enviada. Recibirás la confirmación del profesional.' } });
    } catch (falla) {
      setErrorEnvio(describirError(falla));
      setEnviando(false);
    }
  };

  const resumen = [
    nombreProfesional && mostrarProfesional
      && { clave: 'profesional', titulo: `Nutricionista: ${nombreProfesional}` },
    servicio && {
      clave: 'servicio',
      titulo: `Servicio: ${servicio.nombre}`,
      detalle: `${servicio.duracionMinutos} min · ${formatearPrecio(servicio.precioReferencial)}`,
    },
    inicio && nutricionistaParaReserva && { clave: 'horario', titulo: `Fecha y hora: ${formatearFechaHora(inicio)}` },
  ].filter(Boolean);

  return (
    <Layout barraLateral={
      <ResumenServicios titulo="Resumen de tu reserva" servicios={resumen} onRemover={quitarDelResumen} />
    }>
      <div>
        <h1 className="mb-4 text-3xl font-bold text-exito">Solicitar una cita</h1>
        <Mensaje>{errorEnvio}</Mensaje>
        {preseleccionInvalida && (
          <Mensaje>El profesional seleccionado no está disponible. Elige un servicio y un profesional.</Mensaje>
        )}
        <form onSubmit={enviar} noValidate className="space-y-4">
          <Tarjeta titulo="1. Servicio">
            <EstadoConsulta cargando={servicios.cargando} error={servicios.error} onReintentar={servicios.recargar}>
              <CampoSeleccion etiqueta="Servicio" id="servicio" marcador="Selecciona un servicio" value={servicioId}
                onChange={seleccionarServicio}
                opciones={(servicios.datos ?? []).map((candidato) => ({ valor: candidato.id, etiqueta: candidato.nombre }))} />
            </EstadoConsulta>
          </Tarjeta>

          {profesionalFijado && !preseleccionInvalida && (
            <Tarjeta titulo="2. Nutricionista">
              <EstadoConsulta cargando={profesionalInicial.cargando} error={profesionalInicial.error}
                onReintentar={profesionalInicial.recargar}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="mb-0 font-semibold">{nombreProfesional}</p>
                  <Boton variante="contorno" onClick={cambiarProfesional}>Cambiar profesional</Boton>
                </div>
                {servicioId && profesionalesDelServicio.cargando && (
                  <p role="status" className="mt-3 text-sm text-gray-500">Verificando disponibilidad del servicio…</p>
                )}
                {servicioId && profesionalesDelServicio.error && (
                  <div className="mt-3">
                    <Mensaje>{profesionalesDelServicio.error.mensaje}</Mensaje>
                    <Boton variante="contorno" onClick={profesionalesDelServicio.recargar}>Reintentar</Boton>
                  </div>
                )}
                {servicioIncompatible && (
                  <div className="mt-3">
                    <Mensaje>
                      {nombreProfesional} no ofrece «{servicio?.nombre ?? 'el servicio seleccionado'}». Elige otro servicio o cambia de profesional.
                    </Mensaje>
                    <div className="flex flex-wrap gap-2">
                      <Boton variante="contorno" onClick={elegirOtroServicio}>Elegir otro servicio</Boton>
                      <Boton variante="contorno" onClick={cambiarProfesional}>Cambiar profesional</Boton>
                    </div>
                  </div>
                )}
              </EstadoConsulta>
            </Tarjeta>
          )}

          {(!profesionalFijado || preseleccionInvalida) && servicioId && (
            <Tarjeta titulo="2. Nutricionista">
              <EstadoConsulta cargando={profesionalesDelServicio.cargando} error={profesionalesDelServicio.error}
                onReintentar={profesionalesDelServicio.recargar}
                vacio={listaDelServicio.length === 0} mensajeVacio="No hay profesionales disponibles para este servicio.">
                <CampoSeleccion etiqueta="Nutricionista" id="nutricionista" marcador="Selecciona un profesional"
                  value={profesionalEnServicio ? nutricionistaId : ''} onChange={seleccionarProfesional}
                  opciones={listaDelServicio.map((candidato) => ({ valor: candidato.id, etiqueta: candidato.nombreCompleto }))} />
              </EstadoConsulta>
            </Tarjeta>
          )}

          {servicioId && nutricionistaParaReserva && (
            <Tarjeta titulo="3. Fecha y hora">
              <SelectorHorario key={`${nutricionistaParaReserva}-${servicioId}`} nutricionistaId={nutricionistaParaReserva}
                servicioId={servicioId} seleccionado={inicio} onSeleccionar={setInicio} />
            </Tarjeta>
          )}

          {inicio && nutricionistaParaReserva && (
            <Tarjeta titulo="4. Motivo de la consulta">
              <CampoAreaTexto etiqueta="Motivo" id="motivo" maxLength="500" value={motivo} error={errorMotivo}
                onChange={(evento) => setMotivo(evento.target.value)} />
              <Boton type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</Boton>
            </Tarjeta>
          )}
        </form>
      </div>
    </Layout>
  );
}
