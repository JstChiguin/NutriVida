const buscador = document.getElementById("buscar-servicio");
const tarjetas = document.querySelectorAll(".tarjeta-servicio");
const botonesFiltro = document.querySelectorAll(".filtros-servicios button");


buscador.addEventListener("input", function() {
    const textoBuscado = buscador.value.toLowerCase();

    tarjetas.forEach(function (tarjeta) {
        const textoTarjeta = tarjeta.textContent.toLowerCase();
        const coincide = textoTarjeta.includes(textoBuscado);

        tarjeta.style.display = coincide ? "block" : "none";
    });
});

botonesFiltro.forEach(function (boton) {
    boton.addEventListener("click", function () {
        const filtro = boton.dataset.filtro;

        tarjetas.forEach(function (tarjeta) {
            const textoTarjeta = tarjeta.textContent.toLowerCase();
            const coincide = filtro === "todos" || textoTarjeta.includes(filtro);
            
            tarjeta.style.display = coincide ? "block" : "none";
        });
    });
});

