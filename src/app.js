// Aquí se "monta" la aplicación: se crean los repositorios, los servicios y los
// controladores, y se registran los middleware y las rutas en el orden correcto.
//
// Este archivo NO arranca el servidor (no hace app.listen). Eso lo hace server.js.
// Separarlos permite que las pruebas creen la app y le hagan peticiones con
// Supertest sin abrir ningún puerto.

import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";

import { crearDatosIniciales } from "./datos/semilla.js";
import { fechaDeHoy } from "./utilidades/validacion.js";
import { helpers } from "./vistas/helpers.js";

import { crearRepositorioEquipos } from "./repositorios/repositorioEquipos.js";
import { crearRepositorioReservas } from "./repositorios/repositorioReservas.js";
import { crearRepositorioUsuarios } from "./repositorios/repositorioUsuarios.js";

import { crearServicioEquipos } from "./servicios/servicioEquipos.js";
import { crearServicioReservas } from "./servicios/servicioReservas.js";
import { crearServicioUsuarios } from "./servicios/servicioUsuarios.js";

import { crearControladorEquipos } from "./controladores/equiposControlador.js";
import { crearControladorAuth } from "./controladores/authControlador.js";
import { crearControladorReservas } from "./controladores/reservasControlador.js";
import { crearControladorAdmin } from "./controladores/adminControlador.js";

import { crearRutasPublicas } from "./rutas/rutasPublicas.js";
import { crearRutasAuth } from "./rutas/rutasAuth.js";
import { crearRutasReservas } from "./rutas/rutasReservas.js";
import { crearRutasAdmin } from "./rutas/rutasAdmin.js";

import { crearMiddlewareSesion } from "./middleware/sesion.js";
import { crearCargarUsuario } from "./middleware/cargarUsuario.js";
import { prepararCsrf } from "./middleware/csrf.js";
import { consumirAviso } from "./middleware/avisos.js";
import { crearLimiteLogin } from "./middleware/limiteLogin.js";
import { crearManejadorErrores, noEncontrado } from "./middleware/errores.js";

const RAIZ = path.join(import.meta.dirname, "..");

// opciones.hoy permite "fijar" la fecha de hoy en las pruebas, para que no
// dejen de funcionar cuando pasen las fechas de los datos de ejemplo.
export async function crearApp(config, { hoy = fechaDeHoy } = {}) {
  // 1. Datos y repositorios. Se crean UNA vez por aplicación (no dentro de cada
  //    petición), si no cada petición tendría su propia copia y nada se guardaría.
  const datos = await crearDatosIniciales();
  const repoEquipos = crearRepositorioEquipos(datos.equipos);
  const repoReservas = crearRepositorioReservas(datos.reservas);
  const repoUsuarios = crearRepositorioUsuarios(datos.usuarios);

  // 2. Servicios: reciben los repositorios que necesitan (inyección de dependencias).
  const servicioEquipos = crearServicioEquipos(repoEquipos, repoReservas, hoy);
  const servicioReservas = crearServicioReservas(repoReservas, repoEquipos, repoUsuarios, hoy);
  const servicioUsuarios = crearServicioUsuarios(repoUsuarios);

  // 3. Controladores.
  const esProduccion = config.entorno === "production";
  const controladorEquipos = crearControladorEquipos(servicioEquipos, { esProduccion });
  const controladorAuth = crearControladorAuth(servicioUsuarios, servicioReservas, config);
  const controladorReservas = crearControladorReservas(servicioReservas, hoy);
  const controladorAdmin = crearControladorAdmin(servicioEquipos, servicioReservas);

  // 4. La aplicación Express.
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(RAIZ, "views"));
  app.disable("x-powered-by"); // no anunciamos que usamos Express

  // Solo si hay un proxy de confianza delante (Nginx, Render...). Sin esto,
  // con secure:true detrás de un proxy la cookie de sesión no se enviaría.
  if (config.trustProxy) app.set("trust proxy", 1);

  // Funciones de formato disponibles en todas las vistas.
  Object.assign(app.locals, helpers);

  // 5. Middleware, EN ESTE ORDEN:
  //    - archivos estáticos (CSS): no necesitan sesión
  //    - urlencoded: rellena req.body con los datos del formulario
  //    - cookieParser: rellena req.cookies (para la cookie de preferencias)
  //    - sesión: rellena req.session. Todo lo que use la sesión va DESPUÉS.
  //    - cargarUsuario: con req.session.usuarioId busca al usuario -> req.usuario
  //    - prepararCsrf y consumirAviso: también usan la sesión
  app.use(express.static(path.join(RAIZ, "public")));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));
  app.use(cookieParser());
  app.use(crearMiddlewareSesion(config));
  app.use(crearCargarUsuario(servicioUsuarios));
  app.use(prepararCsrf);
  app.use(consumirAviso);

  // 6. Rutas.
  app.use(crearRutasPublicas(controladorEquipos));
  app.use(crearRutasAuth(controladorAuth, crearLimiteLogin()));
  app.use(crearRutasReservas(controladorReservas));
  app.use("/admin", crearRutasAdmin(controladorAdmin));

  // 7. Al final: 404 para lo que no exista y el manejador de errores (4 parámetros).
  app.use(noEncontrado);
  app.use(crearManejadorErrores(config));

  return app;
}
