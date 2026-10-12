export default function PiePagina() {
  return (
    <footer className="pie-pagina bg-dark text-white pt-5 pb-3">
      <div className="container">
        <div className="row g-4 mb-4">
          <div className="col-12 col-md-4 columna-pie-pagina">
            <h4 className="h5 fw-bold text-success mb-3">Clínica NutriVida</h4>
            <p className="text-secondary small">
              Especialistas en salud nutricional, planes personalizados y seguimiento
              clínico integral en Valparaíso.
            </p>
          </div>

          <div className="col-12 col-md-4 columna-pie-pagina">
            <h4 className="h5 fw-bold text-success mb-3">Horario de Atención</h4>
            <p className="text-secondary small mb-1">Lunes a Viernes: 07:30 - 19:30 hrs</p>
            <p className="text-secondary small mb-1">Sábados: 08:30 - 14:30 hrs</p>
            <p className="text-secondary small mb-0">Domingos y Festivos: Cerrado</p>
          </div>

          <div className="col-12 col-md-4 columna-pie-pagina">
            <h4 className="h5 fw-bold text-success mb-3">Contacto Directo</h4>
            <p className="text-secondary small mb-1">📍 Av. Brasil 2021, Valparaíso</p>
            <p className="text-secondary small mb-1">📞 +56 32 469 1113</p>
            <p className="text-secondary small mb-0">✉️ contacto@nutrivida.cl</p>
          </div>
        </div>

        <div className="border-top border-secondary pt-3 text-center inferior-pie-pagina">
          <p className="small text-muted mb-0">
            &copy; 2026 Clínica Nutricional NutriVida. Todos los derechos reservados. Desarrollado para DSY1104.
          </p>
        </div>
      </div>
    </footer>
  );
}
