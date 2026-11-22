const ZONA_HORARIA = 'America/Santiago';

export function formatearFechaHora(valor) {
  if (!valor) {
    return '';
  }
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA_HORARIA,
  }).format(new Date(valor));
}

export function formatearFecha(valor) {
  if (!valor) {
    return '';
  }
  const fecha = typeof valor === 'string' && valor.length === 10 ? new Date(`${valor}T12:00:00`) : new Date(valor);
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: ZONA_HORARIA }).format(fecha);
}

export function formatearHora(valor) {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA_HORARIA,
  }).format(new Date(valor));
}

export function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor ?? 0);
}

export const ETIQUETAS_ESTADO_CITA = {
  SOLICITADA: 'Solicitada',
  CONFIRMADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  REALIZADA: 'Realizada',
  INASISTENCIA: 'Inasistencia',
};

export const ETIQUETAS_ROL = {
  ADMINISTRADOR: 'Administrador',
  NUTRICIONISTA: 'Nutricionista',
  PACIENTE: 'Paciente',
};

export const ETIQUETAS_DIA = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves', FRIDAY: 'Viernes',
  SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};

export function fechaLocalISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function fechaEnZonaHoraria(valor) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: ZONA_HORARIA,
  }).formatToParts(new Date(valor));
  const parte = (tipo) => partes.find((elemento) => elemento.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export function convertirFechaAInstante(fecha, finDelDia = false) {
  if (!fecha) {
    return undefined;
  }
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const instante = new Date(anio, mes - 1, dia + (finDelDia ? 1 : 0));
  return instante.toISOString();
}
