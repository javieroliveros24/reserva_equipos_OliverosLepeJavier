// Rutas públicas: cualquiera (incluso sin cuenta) puede ver el catálogo.
// En los archivos de rutas solo decimos: método + URL + middleware + controlador.

import { Router } from "express";

export function crearRutasPublicas(controladorEquipos) {
  const router = Router();

  router.get("/", (req, res) => res.redirect(303, "/equipos"));
  router.get("/equipos", controladorEquipos.listar);
  router.get("/equipos/:id", controladorEquipos.ficha);
  router.post("/preferencias/tipo", controladorEquipos.guardarPreferencia);

  return router;
}
