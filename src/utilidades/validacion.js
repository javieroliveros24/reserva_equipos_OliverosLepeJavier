// Funciones pequeñas para validar y convertir lo que llega del navegador.
// Todo lo que viene de un formulario, de la URL o de una cookie es TEXTO
// (o a veces un array, si alguien repite el campo), así que nunca nos fiamos.

import { ErrorDominio } from "../errores/ErrorDominio.js";

// Convierte un identificador que llega como texto ("7") en número (7).
// Solo acepta dígitos sin ceros delante, sin signos ni espacios: "07", "-2",
// " 7", "2.5" o ["7"] se rechazan. También comprobamos que el número sea
// "seguro" en JavaScript (que no pierda precisión).
export function enteroPositivo(valor) {
  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) {
    throw new ErrorDominio("DATOS_INVALIDOS", "El identificador no es válido.");
  }
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) {
    throw new ErrorDominio("DATOS_INVALIDOS", "El identificador no es válido.");
  }
  return numero;
}

// Devuelve el texto sin espacios al principio y al final.
// Si no es un texto (undefined, un array...), devolvemos cadena vacía.
export function texto(valor) {
  return typeof valor === "string" ? valor.trim() : "";
}

// Comprueba que la fecha tenga formato AAAA-MM-DD y que exista de verdad
// (por ejemplo, 2027-02-30 tiene buen formato pero no existe).
export function esFechaValida(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

// La fecha de hoy en formato AAAA-MM-DD según la hora local del servidor.
// Al tener el mismo formato que las reservas, podemos comparar como texto:
// "2027-01-15" < "2027-02-01" funciona porque el orden alfabético coincide
// con el orden de las fechas.
export function fechaDeHoy() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// ---------- Registro y login ----------

// Deja los datos del registro "limpios": sin espacios sobrantes y el correo
// en minúsculas, para que Ana@Example.com y ana@example.com sean el mismo.
// La contraseña NO se recorta: los espacios pueden formar parte de ella.
export function normalizarRegistro(body = {}) {
  return {
    nombre: texto(body.nombre),
    email: texto(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
  };
}

// Un patrón sencillo: algo@algo.algo, sin espacios. No pretende ser perfecto,
// solo evitar errores evidentes.
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarRegistro(datos) {
  const errores = {};
  if (datos.nombre.length < 2 || datos.nombre.length > 80) {
    errores.nombre = "El nombre debe tener entre 2 y 80 caracteres.";
  }
  if (datos.email.length > 254 || !PATRON_EMAIL.test(datos.email)) {
    errores.email = "Escribe un correo electrónico válido.";
  }
  if (datos.password.length < 8 || datos.password.length > 200) {
    errores.password = "La contraseña debe tener entre 8 y 200 caracteres.";
  }
  return { valido: Object.keys(errores).length === 0, errores };
}

export function normalizarLogin(body = {}) {
  return {
    email: texto(body.email).toLowerCase(),
    password: typeof body.password === "string" ? body.password : "",
  };
}

// En el login solo comprobamos que no venga vacío ni absurdamente largo.
// Si el correo no existe o la contraseña está mal, eso ya lo dice el servicio.
export function validarLogin(datos) {
  const errores = {};
  if (datos.email === "" || datos.email.length > 254) {
    errores.email = "Escribe tu correo electrónico.";
  }
  if (datos.password === "" || datos.password.length > 200) {
    errores.password = "Escribe tu contraseña.";
  }
  return { valido: Object.keys(errores).length === 0, errores };
}
