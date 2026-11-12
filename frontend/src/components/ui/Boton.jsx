import { Link } from 'react-router-dom';

const VARIANTES = {
  primario: 'bg-exito text-white hover:bg-exito-oscuro border-transparent',
  contorno: 'bg-white text-exito border-exito hover:bg-green-50',
  peligro: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  suave: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-transparent',
  claro: 'bg-white text-exito hover:bg-green-50 border-transparent',
  contornoClaro: 'bg-transparent text-white border-white hover:bg-white/10',
};

const BASE = 'inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

export function Boton({ variante = 'primario', className = '', type = 'button', ...propiedades }) {
  return <button type={type} className={`${BASE} ${VARIANTES[variante]} ${className}`} {...propiedades} />;
}

export function EnlaceBoton({ variante = 'primario', className = '', ...propiedades }) {
  return <Link className={`${BASE} ${VARIANTES[variante]} ${className}`} {...propiedades} />;
}
