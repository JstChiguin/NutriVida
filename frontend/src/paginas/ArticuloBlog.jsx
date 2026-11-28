import { Link, useParams } from 'react-router-dom';
import { ARTICULOS_BLOG, VIDEO_EDUCATIVO } from '../datos/contenidoBlog.js';
import VideoEducativo from '../components/paginas/VideoEducativo.jsx';
import { NoEncontrada } from './PaginasDeError.jsx';

export default function ArticuloBlog() {
  const { slug } = useParams();
  const articulo = ARTICULOS_BLOG.find((candidato) => candidato.slug === slug);

  if (!articulo) {
    return <NoEncontrada />;
  }

  return (
    <article className="container py-5" aria-labelledby="titulo-articulo">
      <p className="small mb-2"><Link to="/blog">← Volver al blog</Link></p>
      <header className="mb-4">
        <h1 id="titulo-articulo" className="h2 fw-bold text-success">{articulo.titulo}</h1>
        <p className="small text-secondary">
          {articulo.categoria} · <time dateTime={articulo.fecha}>{articulo.fecha}</time>
        </p>
      </header>
      {articulo.parrafos.map((parrafo) => <p key={parrafo.slice(0, 40)}>{parrafo}</p>)}
      {articulo.incluyeVideo && <VideoEducativo video={VIDEO_EDUCATIVO} />}
    </article>
  );
}
