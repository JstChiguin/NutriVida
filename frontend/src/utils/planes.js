export function interpretarComidas(texto) {
  return texto.split('\n').map((linea) => linea.trim()).filter(Boolean).map((linea) => {
    const [nombre, horario, ...alimentos] = linea.split('|').map((parte) => parte.trim());
    return {
      nombre,
      horario: horario || null,
      alimentos: alimentos.map((descripcion) => {
        const [alimento, cantidad, unidad] = descripcion.split(',').map((parte) => parte.trim());
        return { alimento, cantidad: Number(cantidad), unidad };
      }),
    };
  });
}

export function convertirComidasATexto(comidas) {
  return comidas.map((comida) => [comida.nombre, comida.horario ?? '',
    ...comida.alimentos.map((item) => `${item.alimento}, ${item.cantidad}, ${item.unidad}`)].join(' | ')).join('\n');
}
