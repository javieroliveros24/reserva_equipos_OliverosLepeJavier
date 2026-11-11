// Tratamiento centralizado de errores. Va AL FINAL de app.js:
//  1. noEncontrado: si ninguna ruta ha respondido, es un 404.
//  2. manejarErrores: recoge cualquier error que llegue con next(error)
//     (o que lance un controlador async; Express 5 los recoge solo).
//
// Regla de oro: al usuario nunca le enseñamos la traza, ni secretos, ni hashes,
// ni los datos que envió. Los detalles técnicos se quedan en la consola del servidor.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import { estadoHttp } from "../errores/estadosHttp.js";

export function noEncontrado(req, res) {
  res.status(404).render("error", {
    titulo: "Página no encontrada",
    estado: 404,
    mensaje: "La página que buscas no existe.",
  });
}

export function crearManejadorErrores(config) {
  // Los manejadores de error en Express se reconocen por tener 4 parámetros,
  // por eso ponemos "next" aunque casi no lo usemos.
  return function manejarErrores(error, req, res, next) {
    // Si ya se empezó a enviar la respuesta, no podemos mandar otra:
    // se lo pasamos a Express para que cierre la conexión.
    if (res.headersSent) {
      return next(error);
    }

    let estado = 500;
    let mensaje = "Ha ocurrido un error inesperado. Inténtalo más tarde.";

    if (error instanceof ErrorDominio) {
      // Error previsto: su mensaje está pensado para el usuario.
      estado = estadoHttp(error.codigo);
      mensaje = error.message;
    } else if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
      // Errores de Express o del parser (por ejemplo, un formulario demasiado grande).
      estado = error.status;
      mensaje = "La petición no es válida.";
    }

    // Los errores inesperados se apuntan en la consola para poder arreglarlos.
    if (estado === 500 && config.entorno !== "test") {
      console.error(error);
    }

    res.status(estado).render("error", {
      titulo: estado === 403 ? "Acceso denegado" : "Algo no ha ido bien",
      estado,
      mensaje,
    });
  };
}
