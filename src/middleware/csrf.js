// Protección CSRF (Cross-Site Request Forgery).
//
// El problema: si tienes la sesión abierta y entras en una web maliciosa, esa
// web podría enviar un formulario a nuestra aplicación y el navegador
// adjuntaría tu cookie de sesión. Así podrían cancelarte reservas sin que lo sepas.
//
// La solución: cada sesión tiene un token secreto y aleatorio. Lo metemos en
// un campo oculto de nuestros formularios. Cuando llega un POST, comprobamos
// que el token del formulario coincide con el de la sesión. La web maliciosa
// no puede leer nuestras páginas, así que no conoce el token.

import crypto from "node:crypto";
import { ErrorDominio } from "../errores/ErrorDominio.js";

// Crea el token (si no existe) para los usuarios con sesión iniciada y lo deja
// en res.locals.csrfToken para que las vistas lo pongan en los formularios.
// A los visitantes anónimos no les creamos nada, así no generamos sesiones vacías.
export function prepararCsrf(req, res, next) {
  if (req.session.usuarioId !== undefined) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    res.locals.csrfToken = req.session.csrfToken;
  } else {
    res.locals.csrfToken = null;
  }
  next();
}

// Se pone en las rutas POST que cambian algo. Si el token no está o no
// coincide, respondemos 403 y NO se ejecuta la operación.
export function verificarCsrf(req, res, next) {
  const enviado = req.body?._csrf;
  const esperado = req.session.csrfToken;

  if (typeof enviado !== "string" || typeof esperado !== "string") {
    return next(tokenInvalido());
  }

  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);

  // timingSafeEqual compara sin "chivarse" por el tiempo que tarda,
  // pero exige que los dos buffers midan lo mismo; por eso miramos antes la longitud.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return next(tokenInvalido());
  }
  next();
}

function tokenInvalido() {
  return new ErrorDominio(
    "CSRF_INVALIDO",
    "El formulario ha caducado o no es válido. Vuelve a cargar la página e inténtalo de nuevo."
  );
}
