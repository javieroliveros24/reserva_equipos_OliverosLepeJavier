// Configuración de express-session y unas funciones de ayuda.
//
// La cookie "dwes.sid" solo lleva un identificador firmado. Los datos de verdad
// (quién eres, el aviso pendiente, el token CSRF) se quedan en el servidor.

import session from "express-session";

export const NOMBRE_COOKIE_SESION = "dwes.sid";
const TREINTA_MINUTOS = 30 * 60 * 1000;

// Opciones de la cookie que se repiten al crearla y al borrarla en el logout.
// Si al borrar no coinciden (path, sameSite, secure), el navegador no la quita.
export function opcionesCookieSesion(config) {
  return {
    path: "/",
    httpOnly: true, // el JavaScript de la página no puede leerla (document.cookie)
    sameSite: "lax", // no se envía en peticiones POST que vengan de otras webs
    secure: config.entorno === "production", // en producción solo por HTTPS
  };
}

export function crearMiddlewareSesion(config) {
  // Nota: por defecto express-session guarda las sesiones en memoria (MemoryStore).
  // Para la práctica vale, pero se pierden al reiniciar y no sirve para producción
  // real; ahí se usaría Redis o una base de datos.
  return session({
    name: NOMBRE_COOKIE_SESION,
    secret: config.sessionSecret, // viene del .env, nunca escrito en el código
    resave: false, // no volver a guardar la sesión si no ha cambiado
    saveUninitialized: false, // no crear sesión (ni cookie) a quien no la necesita
    rolling: true, // cada respuesta renueva la cookie: caduca tras 30 min SIN actividad
    cookie: {
      ...opcionesCookieSesion(config),
      maxAge: TREINTA_MINUTOS,
    },
  });
}

// express-session funciona con callbacks. Estas funciones los convierten en
// promesas para poder usar await y que el código se lea de arriba abajo.

export function guardarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

export function regenerarSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

export function destruirSesion(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

// Inicia sesión de forma segura:
//  1. regenerate: tiramos la sesión anterior y creamos una con identificador NUEVO.
//     Así evitamos la "fijación de sesión": si alguien conocía el id de antes
//     del login, ya no le sirve para nada.
//  2. Guardamos SOLO el id del usuario (nada de rol, ni nombre, ni contraseña).
//     El rol se consulta en el servidor en cada petición.
//  3. Esperamos a que se guarde antes de redirigir. Si falla, el error sube
//     y no se redirige.
export async function iniciarSesion(req, usuario, aviso) {
  await regenerarSesion(req);
  req.session.usuarioId = usuario.id;
  if (aviso) req.session.aviso = aviso;
  await guardarSesion(req);
}
