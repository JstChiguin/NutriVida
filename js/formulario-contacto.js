import {
  validarNombre,
  validarCorreo,
  validarTelefono,
  validarMotivo,
  validarMensaje,
  validarPrivacidad,
} from "./validadores.js";

const formulario = document.querySelector("#formulario-contacto");
const panelExito = document.querySelector("#panel-exito");
const botonReset = document.querySelector("#btn-nuevo-mensaje");

const etiquetasMotivo = {
  consulta_inicial: "Primera Consulta Nutricional",
  perdida_peso: "Plan Pérdida de Peso",
  metabolica: "Control Diabetes / Hipertensión",
  deportiva: "Nutrición Deportiva",
  vegetariana_vegana: "Alimentación Vegetariana / Vegana",
  infantil: "Nutrición Infantil (2-12 años)",
  evaluacion: "Evaluación Corporal (Antropometría / Bioimpedancia)",
  general: "Consulta General u Horas de Atención",
};

function mostrarError(nombreCampo, mensaje) {
  const campo = formulario.elements[nombreCampo];
  const elementoError = document.querySelector(`[data-error-for="${nombreCampo}"]`);
  const tieneError = Boolean(mensaje);

  if (elementoError) {
    elementoError.textContent = mensaje || "";
  }

  if (campo) {
    campo.setAttribute("aria-invalid", tieneError ? "true" : "false");
    campo.classList.toggle("is-invalid", tieneError);

    const tieneValor = campo.type === "checkbox"
      ? campo.checked
      : Boolean(campo.value && campo.value.trim().length > 0);

    campo.classList.toggle("is-valid", !tieneError && tieneValor);
  }
}

function validarCampo(nombreCampo, valor) {
  switch (nombreCampo) {
    case "nombre":
      return validarNombre(valor);
    case "correo":
      return validarCorreo(valor);
    case "telefono":
      return validarTelefono(valor);
    case "motivo":
      return validarMotivo(valor);
    case "mensaje":
      return validarMensaje(valor);
    case "privacidad":
      return validarPrivacidad(valor);
    default:
      return null;
  }
}

function configurarValidacionEnTiempoReal() {
  const campos = ["nombre", "correo", "telefono", "motivo", "mensaje", "privacidad"];

  campos.forEach((nombreCampo) => {
    const elemento = formulario.elements[nombreCampo];
    if (!elemento) return;

    const obtenerValor = () => {
      if (elemento.type === "checkbox") {
        return elemento.checked;
      }
      return elemento.value.trim();
    };

    elemento.addEventListener("blur", () => {
      const valor = obtenerValor();
      if (valor !== "" || nombreCampo !== "telefono") {
        const error = validarCampo(nombreCampo, valor);
        mostrarError(nombreCampo, error);
      }
    });

    const eventoInteraccion = elemento.type === "checkbox" || elemento.tagName === "SELECT" ? "change" : "input";

    elemento.addEventListener(eventoInteraccion, () => {
      if (elemento.type === "checkbox" || elemento.tagName === "SELECT") {
        const valor = obtenerValor();
        const error = validarCampo(nombreCampo, valor);
        mostrarError(nombreCampo, error);
        return;
      }

      if (elemento.classList.contains("is-invalid") || elemento.classList.contains("is-valid")) {
        const valor = obtenerValor();
        const error = validarCampo(nombreCampo, valor);
        mostrarError(nombreCampo, error);
      }
    });
  });
}

function enviarFormulario(evento) {
  evento.preventDefault();

  const datos = new FormData(formulario);
  const valores = {
    nombre: (datos.get("nombre") ?? "").toString().trim(),
    correo: (datos.get("correo") ?? "").toString().trim(),
    telefono: (datos.get("telefono") ?? "").toString().trim(),
    motivo: (datos.get("motivo") ?? "").toString().trim(),
    mensaje: (datos.get("mensaje") ?? "").toString().trim(),
    privacidad: formulario.elements["privacidad"] ? formulario.elements["privacidad"].checked : false,
  };

  const errorNombre = validarNombre(valores.nombre);
  const errorCorreo = validarCorreo(valores.correo);
  const errorTelefono = validarTelefono(valores.telefono);
  const errorMotivo = validarMotivo(valores.motivo);
  const errorMensaje = validarMensaje(valores.mensaje);
  const errorPrivacidad = validarPrivacidad(valores.privacidad);

  mostrarError("nombre", errorNombre);
  mostrarError("correo", errorCorreo);
  mostrarError("telefono", errorTelefono);
  mostrarError("motivo", errorMotivo);
  mostrarError("mensaje", errorMensaje);
  mostrarError("privacidad", errorPrivacidad);

  const primerError =
    (errorNombre && "nombre") ||
    (errorCorreo && "correo") ||
    (errorTelefono && "telefono") ||
    (errorMotivo && "motivo") ||
    (errorMensaje && "mensaje") ||
    (errorPrivacidad && "privacidad");

  if (primerError) {
    formulario.elements[primerError].focus();
    return;
  }

  formulario.classList.add("oculto");
  const introContacto = document.querySelector("#intro-contacto");
  if (introContacto) {
    introContacto.classList.add("oculto");
  }

  panelExito.classList.remove("oculto");
  panelExito.querySelector("[data-exito-nombre]").textContent = valores.nombre;
  panelExito.querySelector("[data-exito-correo]").textContent = valores.correo;
  panelExito.querySelector("[data-exito-motivo]").textContent =
    etiquetasMotivo[valores.motivo] || "Consulta nutricional";

  const elemTelefono = panelExito.querySelector("[data-exito-telefono]");
  if (elemTelefono) {
    if (valores.telefono) {
      elemTelefono.textContent = `Teléfono: ${valores.telefono}`;
      elemTelefono.classList.remove("oculto");
    } else {
      elemTelefono.classList.add("oculto");
    }
  }

  panelExito.focus();
}

function reiniciarFormulario() {
  formulario.reset();

  const campos = ["nombre", "correo", "telefono", "motivo", "mensaje", "privacidad"];
  campos.forEach((nombreCampo) => {
    const campo = formulario.elements[nombreCampo];
    const elementoError = document.querySelector(`[data-error-for="${nombreCampo}"]`);
    if (campo) {
      campo.classList.remove("is-invalid", "is-valid");
      campo.removeAttribute("aria-invalid");
    }
    if (elementoError) {
      elementoError.textContent = "";
    }
  });

  panelExito.classList.add("oculto");
  formulario.classList.remove("oculto");
  const introContacto = document.querySelector("#intro-contacto");
  if (introContacto) {
    introContacto.classList.remove("oculto");
  }

  formulario.elements["nombre"].focus();
}

formulario.addEventListener("submit", enviarFormulario);
configurarValidacionEnTiempoReal();

if (botonReset) {
  botonReset.addEventListener("click", reiniciarFormulario);
}

