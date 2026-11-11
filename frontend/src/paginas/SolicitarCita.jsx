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

export default function SolicitarCita() {
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const [servicioId, setServicioId] = useState(parametros.get('servicioId') ?? '');
  const [nutricionistaId, setNutricionistaId] = useState(parametros.get('nutricionistaId') ?? '');
  const [inicio, setInicio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);

  const servicios = useConsulta(() => clinicoApi.listarServicios({ tamano: 50 }));
  const profesionales = useConsulta(() => clinicoApi.listarNutricionistas({ tamano: 50, servicioId }), { servicioId });

  const servicio = servicios.datos?.contenido.find((candidato) => candidato.id === servicioId);
  const profesional = profesionales.datos?.contenido.find((candidato) => candidato.id === nutricionistaId);

  const seleccionarServicio = (evento) => {
    setServicioId(evento.target.value);
    setNutricionistaId('');
    setInicio('');
  };

  const seleccionarProfesional = (evento) => {
    setNutricionistaId(evento.target.value);
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
      await agendaApi.solicitarCita({ nutricionistaId, servicioId, inicio, motivoConsulta: motivo.trim() });
      navegar('/mis-citas', { state: { mensaje: 'Solicitud enviada. Recibirás la confirmación del profesional.' } });
    } catch (falla) {
      setErrorEnvio(describirError(falla));
      setEnviando(false);
    }
  };

  const resumen = [
    servicio && `${servicio.nombre} (${servicio.duracionMinutos} min · ${formatearPrecio(servicio.precioReferencial)})`,
    profesional && `Con ${profesional.nombreCompleto}`,
    inicio && formatearFechaHora(inicio),
  ].filter(Boolean);

  return (
    <Layout barraLateral={
      <ResumenServicios servicios={resumen} onRemover={(elemento) => {
        if (elemento.startsWith('Con ')) {
          setNutricionistaId('');
        }
        if (elemento.includes('min ·')) {
          setServicioId('');
          setNutricionistaId('');
        }
        setInicio('');
      }} />
    }>
      <div>
        <h1 className="mb-4 text-3xl font-bold text-exito">Solicitar una cita</h1>
        <Mensaje>{errorEnvio}</Mensaje>
        <form onSubmit={enviar} noValidate className="space-y-4">
          <Tarjeta titulo="1. Servicio">
            <EstadoConsulta cargando={servicios.cargando} error={servicios.error} onReintentar={servicios.recargar}>
              <CampoSeleccion etiqueta="Servicio" id="servicio" marcador="Selecciona un servicio" value={servicioId}
                onChange={seleccionarServicio}
                opciones={(servicios.datos?.contenido ?? []).map((candidato) => ({ valor: candidato.id, etiqueta: candidato.nombre }))} />
            </EstadoConsulta>
          </Tarjeta>

          {servicioId && (
            <Tarjeta titulo="2. Nutricionista">
              <EstadoConsulta cargando={profesionales.cargando} error={profesionales.error} onReintentar={profesionales.recargar}
                vacio={profesionales.datos?.contenido.length === 0} mensajeVacio="No hay profesionales disponibles para este servicio.">
                <CampoSeleccion etiqueta="Nutricionista" id="nutricionista" marcador="Selecciona un profesional"
                  value={nutricionistaId} onChange={seleccionarProfesional}
                  opciones={(profesionales.datos?.contenido ?? []).map((candidato) => ({ valor: candidato.id, etiqueta: candidato.nombreCompleto }))} />
              </EstadoConsulta>
            </Tarjeta>
          )}

          {servicioId && nutricionistaId && (
            <Tarjeta titulo="3. Fecha y hora">
              <SelectorHorario nutricionistaId={nutricionistaId} servicioId={servicioId} seleccionado={inicio}
                onSeleccionar={setInicio} />
            </Tarjeta>
          )}

          {inicio && (
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
