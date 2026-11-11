// Rutas de registro, login, logout y perfil.

import { Router } from "express";
import { exigirLogin } from "../middleware/autorizacion.js";
import { verificarCsrf } from "../middleware/csrf.js";

export function crearRutasAuth(controladorAuth, limiteLogin) {
  const router = Router();

  router.get("/registro", controladorAuth.mostrarRegistro);
  router.post("/registro", controladorAuth.registrar);

  router.get("/login", controladorAuth.mostrarLogin);
  // El límite de intentos solo se aplica al POST del login.
  router.post("/login", limiteLogin, controladorAuth.login);

  // Primero comprobamos que hay sesión y luego el token CSRF.
  router.post("/logout", exigirLogin, verificarCsrf, controladorAuth.logout);

  router.get("/perfil", exigirLogin, controladorAuth.perfil);

  return router;
}
