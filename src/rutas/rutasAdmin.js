// Rutas de administración. Este router se monta en /admin y lo primero que
// hace es exigir el rol admin, así no se nos puede olvidar en ninguna ruta.
// Un usuario normal que escriba la URL a mano recibe un 403.

import { Router } from "express";
import { exigirRol } from "../middleware/autorizacion.js";
import { verificarCsrf } from "../middleware/csrf.js";

export function crearRutasAdmin(controladorAdmin) {
  const router = Router();

  router.use(exigirRol("admin"));

  router.get("/equipos", controladorAdmin.equipos);
  router.post("/equipos", verificarCsrf, controladorAdmin.crearEquipo);
  router.post("/equipos/:id/estado", verificarCsrf, controladorAdmin.cambiarEstado);

  router.get("/reservas", controladorAdmin.reservas);
  router.post("/reservas/:id/cancelar", verificarCsrf, controladorAdmin.cancelarReserva);

  return router;
}
