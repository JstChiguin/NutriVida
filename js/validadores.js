
export function estaVacio(valor) {
  if (valor === null || valor === undefined) {
    return true;
  }

  if (typeof valor === "boolean") {
    return false;
  }

  return String(valor).trim() === "";
}

/**
 * Valida que un campo no esté vacío o que un booleano sea true
 * @param {any} valor 
 * @param {string} mensaje 
 * @returns {string|null}
 */
export function obligatorio(valor, mensaje = "Este campo es obligatorio") {
  if (typeof valor === "boolean") {
    return valor ? null : mensaje;
  }

  return estaVacio(valor) ? mensaje : null;
}

/**
 * Valida la longitud mínima de una cadena de texto
 * @param {string} valor 
 * @param {number} minimo 
 * @param {string} mensaje 
 * @returns {string|null}
 */
export function longitudMinima(valor, minimo, mensaje) {
  if (estaVacio(valor)) {
    return null;
  }

  const texto = String(valor).trim();
  return texto.length < minimo
    ? mensaje || `Debe tener al menos ${minimo} caracteres`
    : null;
}

/**
 * Valida la longitud máxima de una cadena de texto
 * @param {string} valor 
 * @param {number} maximo 
 * @param {string} mensaje 
 * @returns {string|null}
 */
export function longitudMaxima(valor, maximo, mensaje) {
  if (estaVacio(valor)) {
    return null;
  }

  const texto = String(valor).trim();
  return texto.length > maximo
    ? mensaje || `No puede superar los ${maximo} caracteres`
    : null;
}

/**
 * Valida el formato de una dirección de correo electrónico
 * @param {string} valor 
 * @param {string} mensaje 
 * @returns {string|null}
 */
export function correo(
  valor,
  mensaje = "El correo ingresado no es válido",
) {
  if (estaVacio(valor)) {
    return null;
  }

  const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return patronCorreo.test(String(valor).trim()) ? null : mensaje;
}

/**
 * Valida que el texto contenga únicamente letras y espacios (soporta acentos y ñ)
 * @param {string} valor 
 * @param {string} mensaje 
 * @returns {string|null}
 */
export function soloLetras(valor, mensaje = "El nombre solo puede contener letras y espacios") {
  if (estaVacio(valor)) {
    return null;
  }

  const patronLetras = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]+$/;
  return patronLetras.test(String(valor).trim()) ? null : mensaje;
}

/**
 * Valida números de teléfono chilenos (9 dígitos locales comenzando con 9, u 11 con código país 569)
 * @param {string} valor 
 * @param {string} mensaje 
 * @returns {string|null}
 */
export function telefonoChileno(
  valor,
  mensaje = "Ingresa un celular chileno válido (ej: 9 1234 5678)",
) {
  if (estaVacio(valor)) {
    return null;
  }

  const digitos = String(valor).replace(/\D/g, "");
  const esCelularLocal = digitos.length === 9 && digitos.startsWith("9");
  const esCelularInternacional =
    digitos.length === 11 && digitos.startsWith("569");

  return esCelularLocal || esCelularInternacional ? null : mensaje;
}


export function validarNombre(valor) {
  return (
    obligatorio(valor, "El nombre es obligatorio") ||
    longitudMinima(valor, 3, "El nombre debe tener al menos 3 caracteres") ||
    longitudMaxima(valor, 50, "El nombre no puede superar 50 caracteres") ||
    soloLetras(valor, "El nombre solo puede contener letras y espacios")
  );
}


export function validarCorreo(valor) {
  return (
    obligatorio(valor, "El correo es obligatorio") ||
    correo(valor, "El correo ingresado no es válido (ej: paciente@correo.cl)")
  );
}

/**
 * Valida el teléfono celular (campo opcional, pero si se escribe debe ser válido)
 */
export function validarTelefono(valor) {
  if (estaVacio(valor)) {
    return null;
  }

  return telefonoChileno(
    valor,
    "Ingresa un celular válido de 9 dígitos (ej: 9 1234 5678)",
  );
}

/**
 * Valida el motivo de consulta basado en las especialidades de NutriVida
 */
export function validarMotivo(valor) {
  const motivosValidos = [
    "consulta_inicial",
    "perdida_peso",
    "metabolica",
    "deportiva",
    "vegetariana_vegana",
    "infantil",
    "evaluacion",
    "general"
  ];

  return (
    obligatorio(valor, "Selecciona el motivo de tu consulta") ||
    (motivosValidos.includes(valor)
      ? null
      : "Selecciona una opción válida de la lista")
  );
}

/**
 * Valida el cuerpo del mensaje de la consulta
 */
export function validarMensaje(valor) {
  return (
    obligatorio(valor, "El mensaje es obligatorio") ||
    longitudMinima(valor, 15, "El mensaje debe tener al menos 15 caracteres para poder orientarte") ||
    longitudMaxima(valor, 600, "El mensaje no puede superar los 600 caracteres")
  );
}

/**
 * Valida el consentimiento de privacidad y tratamiento confidencial de datos de salud
 */
export function validarPrivacidad(valor) {
  return obligatorio(
    valor,
    "Debes aceptar el tratamiento confidencial de tus datos para enviar la consulta",
  );
}

