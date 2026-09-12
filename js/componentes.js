async function cargarComponente(selector, ruta) {
    const contenedor = document.querySelector(selector);

    if (!contenedor) {
        return;
    }

    const respuesta = await fetch(ruta);
    const contenido = await respuesta.text();

    contenedor.innerHTML = contenido;
}

cargarComponente("#contenedor-encabezado", "componentes/encabezado.html");

cargarComponente("#contenedor-pie-pagina", "componentes/pie-pagina.html");