import { Link } from 'react-router-dom';

const VARIANTES = {
  primario: 'boton-primario',
  contorno: 'boton-contorno',
  suave: 'boton-contorno',
  peligro: 'boton-peligro',
  claro: 'boton-claro',
  contornoClaro: 'boton-contorno-claro',
};

function clasesDeBoton(variante, className) {
  return ['boton', VARIANTES[variante] ?? VARIANTES.primario, className].filter(Boolean).join(' ');
}

export function Boton({ variante = 'primario', className = '', type = 'button', ...propiedades }) {
  return <button type={type} className={clasesDeBoton(variante, className)} {...propiedades} />;
}

export function EnlaceBoton({ variante = 'primario', className = '', ...propiedades }) {
  return <Link className={clasesDeBoton(variante, className)} {...propiedades} />;
}
