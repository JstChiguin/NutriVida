import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizRepositorio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carpetaEsquemas = path.join(raizRepositorio, 'backend/comun/src/main/resources/esquemas');
const archivoScript = path.join(raizRepositorio, 'mongodb/01_crear_colecciones_validadores_indices.js');
const soloVerificar = process.argv.includes('--verificar');

const esquemas = Object.fromEntries(
  fs.readdirSync(carpetaEsquemas)
    .filter((nombre) => nombre.endsWith('.json'))
    .sort()
    .map((nombre) => [nombre.replace('.json', ''), JSON.parse(fs.readFileSync(path.join(carpetaEsquemas, nombre), 'utf8'))]),
);

const bloqueEsquemas = `const esquemas = ${JSON.stringify(esquemas, null, 2)};`;
const patron = /^const esquemas = \{[\s\S]*?^\};$/m;
const actual = fs.readFileSync(archivoScript, 'utf8');

if (!patron.test(actual)) {
  console.error('El script 01 no contiene el bloque const esquemas');
  process.exit(2);
}

const actualizado = actual.replace(patron, () => bloqueEsquemas);

if (soloVerificar) {
  const sincronizado = actualizado.replace(/\r\n/g, '\n') === actual.replace(/\r\n/g, '\n');
  console.log(sincronizado ? 'Validadores sincronizados con los JSON de Spring' : 'DESINCRONIZADOS: ejecute node scripts/generar-script-validadores.mjs');
  process.exit(sincronizado ? 0 : 1);
}

fs.writeFileSync(archivoScript, actualizado);
console.log(`Script actualizado con ${Object.keys(esquemas).length} validadores`);
