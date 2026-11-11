// Middleware reutilizable para proteger rutas.
//
// Autenticación = saber QUIÉN eres (has iniciado sesión).
// Autorización  = saber si PUEDES hacer algo (tu rol te lo permite).
//
// Ocultar un botón en la vista no protege nada: cualquiera puede escribir
// la URL o mandar la petición a mano. La protección de verdad es esta.

import { ErrorDominio } from "../errores/ErrorDominio.js";

// Si no hay usuario cargado, lo mandamos al login con 303.
export function exigirLogin(req, res, next) {
  if (!req.usuario) {
    return res.redirect(303, "/login");
  }
  next();
}

// Ejemplo de uso: exigirRol("admin").
// - Sin sesión -> al login (303).
// - Con sesión pero sin el rol -> 403 (lo pinta el manejador de errores).
// - Con el rol -> adelante.
export function exigirRol(...rolesPermitidos) {
  return function comprobarRol(req, res, next) {
    if (!req.usuario) {
      return res.redirect(303, "/login");
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new ErrorDominio("SIN_PERMISO", "No tienes permiso para acceder a esta página."));
    }
    next();
  };
}
