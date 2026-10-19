import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Inicio from './components/paginas/Inicio';
import Contacto from './components/paginas/Contacto';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="contacto" element={<Contacto />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
