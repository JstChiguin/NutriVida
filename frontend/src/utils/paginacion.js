export const TAMANO_PAGINA_MAXIMO = 100;

export async function consultarTodasLasPaginas(consulta, parametros = {}) {
  const contenido = [];
  for (let pagina = 0; ; pagina += 1) {
    const respuesta = await consulta({ ...parametros, pagina, tamano: TAMANO_PAGINA_MAXIMO });
    contenido.push(...(respuesta?.contenido ?? []));
    const totalPaginas = Number.isInteger(respuesta?.totalPaginas) ? respuesta.totalPaginas : 1;
    if (pagina + 1 >= totalPaginas) {
      return contenido;
    }
  }
}
