import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import Blog from '../src/paginas/Blog.jsx';
import ArticuloBlog from '../src/paginas/ArticuloBlog.jsx';
import Nosotros from '../src/paginas/Nosotros.jsx';
import { ARTICULOS_BLOG } from '../src/datos/contenidoBlog.js';
import { renderizarEn } from './ayudas.jsx';

function RutasBlog() {
  return (
    <Routes>
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<ArticuloBlog />} />
    </Routes>
  );
}

describe('Blog y video educativo', () => {
  it('lista al menos dos artículos con enlace a su detalle', () => {
    renderizarEn(<RutasBlog />, '/blog');

    expect(ARTICULOS_BLOG.length).toBeGreaterThanOrEqual(2);
    ARTICULOS_BLOG.forEach((articulo) => {
      expect(screen.getByRole('heading', { name: articulo.titulo })).toBeTruthy();
    });
    expect(screen.getAllByRole('link', { name: 'Leer artículo' })[0].getAttribute('href')).toBe(`/blog/${ARTICULOS_BLOG[0].slug}`);
  });

  it('incorpora un video embebido con título accesible y sin cookies de seguimiento', () => {
    renderizarEn(<RutasBlog />, '/blog');

    const video = screen.getByTitle(/Guías Alimentarias para Chile/);
    expect(video.tagName).toBe('IFRAME');
    expect(video.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    expect(screen.getByRole('link', { name: 'Ver en YouTube' }).getAttribute('rel')).toContain('noopener');
  });

  it('muestra el detalle de un artículo con encabezado, fecha y texto completo', () => {
    renderizarEn(<RutasBlog />, `/blog/${ARTICULOS_BLOG[1].slug}`);

    const articulo = screen.getByRole('article');
    expect(within(articulo).getByRole('heading', { level: 1, name: ARTICULOS_BLOG[1].titulo })).toBeTruthy();
    expect(articulo.querySelector('time').getAttribute('datetime')).toBe(ARTICULOS_BLOG[1].fecha);
    expect(within(articulo).getAllByText(/./, { selector: 'p' }).length).toBeGreaterThan(3);
    expect(screen.getByRole('link', { name: '← Volver al blog' }).getAttribute('href')).toBe('/blog');
  });

  it('un artículo inexistente muestra la página de error en lugar de contenido', () => {
    renderizarEn(<RutasBlog />, '/blog/no-existe');

    expect(screen.queryByRole('article')).toBeNull();
  });
});

describe('Página Nosotros', () => {
  it('presenta a la clínica como ficticia con dirección referencial en Valparaíso y al equipo', () => {
    renderizarEn(<Nosotros />, '/nosotros');

    expect(screen.getByRole('heading', { level: 1, name: 'Sobre NutriVida' })).toBeTruthy();
    expect(screen.getByText(/ficticia/)).toBeTruthy();
    expect(screen.getByText(/Av\. Brasil 2021, Valparaíso/)).toBeTruthy();
    expect(screen.getByText(/referencial/)).toBeTruthy();
    ['Chiguin Chiang', 'Victoria Ortega', 'Arlette Patiño'].forEach((nombre) => {
      expect(screen.getByText(nombre)).toBeTruthy();
    });
  });
});
