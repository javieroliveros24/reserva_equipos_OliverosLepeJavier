// Rutas de reservas: todas necesitan sesión iniciada.
// Las que cambian algo (POST) además comprueban el token CSRF.

import { Router } from "express";
import { exigirLogin } from "../middleware/autorizacion.js";
import { verificarCsrf } from "../middleware/csrf.js";

export function crearRutasReservas(controladorReservas) {
  const router = Router();

  router.get("/reservas/nueva", exigirLogin, controladorReservas.mostrarFormulario);
  router.post("/reservas", exigirLogin, verificarCsrf, controladorReservas.crear);

  router.get("/mis-reservas", exigirLogin, controladorReservas.misReservas);
  router.post("/reservas/:id/cancelar", exigirLogin, verificarCsrf, controladorReservas.cancelar);

  return router;
}
