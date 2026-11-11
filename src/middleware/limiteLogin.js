// Límite de intentos de inicio de sesión con express-rate-limit.
// Como máximo 10 intentos cada 15 minutos desde la misma IP. Al pasarse,
// respondemos 429 (Too Many Requests).
//
// Esto frena a quien prueba contraseñas a lo bruto, pero no lo para todo:
// un ataque desde muchas IPs distintas podría seguir. Tampoco bloqueamos la
// cuenta para siempre, porque entonces cualquiera podría dejar sin acceso a
// otra persona solo con fallar su contraseña a propósito.

import { rateLimit } from "express-rate-limit";

export function crearLimiteLogin() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // ventana de 15 minutos
    limit: 10, // 10 intentos por ventana
    standardHeaders: "draft-7", // cabecera estándar RateLimit
    legacyHeaders: false, // sin las cabeceras antiguas X-RateLimit-*
    handler(req, res, next, opciones) {
      res.status(opciones.statusCode).render("auth/login", {
        titulo: "Iniciar sesión",
        email: "",
        errores: ["Demasiados intentos. Espera unos minutos antes de volver a probar."],
        sesionCerrada: false,
      });
    },
  });
}
