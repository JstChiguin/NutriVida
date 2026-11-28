import { Link } from 'react-router-dom';
import { ARTICULOS_BLOG, VIDEO_EDUCATIVO } from '../datos/contenidoBlog.js';
import VideoEducativo from '../components/paginas/VideoEducativo.jsx';

export default function Blog() {
  return (
    <section className="container py-5" aria-labelledby="titulo-blog">
      <h1 id="titulo-blog" className="h2 fw-bold text-success mb-2">Blog de nutrición</h1>
      <p className="text-secondary mb-4">
        Artículos informativos de la clínica ficticia NutriVida. No reemplazan una consulta profesional.
      </p>
      <div className="row g-4 mb-5">
        {ARTICULOS_BLOG.map((articulo) => (
          <div className="col-md-6" key={articulo.slug}>
            <article className="card h-100 shadow-sm">
              <div className="card-body">
                <p className="small text-secondary mb-1">
                  {articulo.categoria} · <time dateTime={articulo.fecha}>{articulo.fecha}</time>
                </p>
                <h2 className="h5 fw-bold">{articulo.titulo}</h2>
                <p>{articulo.resumen}</p>
                <Link to={`/blog/${articulo.slug}`} className="boton boton-contorno">Leer artículo</Link>
              </div>
            </article>
          </div>
        ))}
      </div>
      <section aria-labelledby="titulo-video">
        <h2 id="titulo-video" className="h4 fw-bold mb-3">Video recomendado</h2>
        <VideoEducativo video={VIDEO_EDUCATIVO} />
      </section>
    </section>
  );
}
