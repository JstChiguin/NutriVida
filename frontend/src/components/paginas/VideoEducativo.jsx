export default function VideoEducativo({ video }) {
  return (
    <figure className="video-educativo">
      <div className="ratio ratio-16x9">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.identificador}`}
          title={`${video.titulo} (${video.fuente})`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <figcaption className="small text-secondary mt-2">
        {video.titulo}. Fuente: {video.fuente}.{' '}
        <a href={video.enlace} target="_blank" rel="noopener noreferrer">Ver en YouTube</a>
      </figcaption>
    </figure>
  );
}
