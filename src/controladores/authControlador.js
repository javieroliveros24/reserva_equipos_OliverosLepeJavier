// Controlador de registro, login, logout y perfil.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import { estadoHttp } from "../errores/estadosHttp.js";
import {
  normalizarLogin,
  normalizarRegistro,
  validarLogin,
  validarRegistro,
} from "../utilidades/validacion.js";
import {
  NOMBRE_COOKIE_SESION,
  destruirSesion,
  guardarSesion,
  iniciarSesion,
  opcionesCookieSesion,
} from "../middleware/sesion.js";

export function crearControladorAuth(servicioUsuarios, servicioReservas, config) {
  // Pinta el formulario de registro. Nunca devolvemos la contraseña a la vista.
  function vistaRegistro(res, estado, { nombre = "", email = "" } = {}, errores = []) {
    res.status(estado).render("auth/registro", {
      titulo: "Crear cuenta",
      valores: { nombre, email },
      errores,
    });
  }

  function vistaLogin(res, estado, email = "", errores = [], sesionCerrada = false) {
    res.status(estado).render("auth/login", {
      titulo: "Iniciar sesión",
      email,
      errores,
      sesionCerrada,
    });
  }

  return {
    // GET /registro
    mostrarRegistro(req, res) {
      if (req.usuario) return res.redirect(303, "/perfil");
      vistaRegistro(res, 200);
    },

    // POST /registro
    async registrar(req, res) {
      // Cogemos SOLO los campos que esperamos. Si alguien envía rol=admin,
      // se queda fuera porque nunca lo leemos.
      const datos = normalizarRegistro(req.body);
      const { valido, errores } = validarRegistro(datos);

      if (!valido) {
        // Conservamos los campos que estaban bien (la contraseña nunca).
        return vistaRegistro(
          res,
          400,
          { nombre: errores.nombre ? "" : datos.nombre, email: errores.email ? "" : datos.email },
          Object.values(errores)
        );
      }

      try {
        await servicioUsuarios.registrar(datos);
      } catch (error) {
        if (error instanceof ErrorDominio && error.codigo === "EMAIL_DUPLICADO") {
          return vistaRegistro(res, estadoHttp(error.codigo), { nombre: datos.nombre }, [error.message]);
        }
        throw error; // cualquier otro error va al manejador central
      }

      req.session.aviso = "Cuenta creada correctamente. Ya puedes iniciar sesión.";
      await guardarSesion(req);
      res.redirect(303, "/login");
    },

    // GET /login
    mostrarLogin(req, res) {
      if (req.usuario) return res.redirect(303, "/perfil");
      vistaLogin(res, 200, "", [], req.query.sesion === "cerrada");
    },

    // POST /login
    async login(req, res) {
      const datos = normalizarLogin(req.body);
      const { valido, errores } = validarLogin(datos);
      if (!valido) {
        return vistaLogin(res, 400, errores.email ? "" : datos.email, Object.values(errores));
      }

      let usuario;
      try {
        usuario = await servicioUsuarios.autenticar(datos.email, datos.password);
      } catch (error) {
        if (error instanceof ErrorDominio && error.codigo === "CREDENCIALES_INVALIDAS") {
          // Mismo código (401) y mismo texto, falle el correo o la contraseña.
          return vistaLogin(res, 401, datos.email, [error.message]);
        }
        throw error;
      }

      await iniciarSesion(req, usuario, `Hola, ${usuario.nombre}. Has iniciado sesión.`);
      res.redirect(303, "/perfil");
    },

    // POST /logout  (protegido con CSRF en la ruta)
    // Orden: primero destruimos la sesión en el servidor (para que ese id ya no
    // valga aunque alguien lo haya copiado) y después le decimos al navegador
    // que borre la cookie. Se hace con POST y no con GET porque cambia el estado:
    // un simple enlace o una imagen en otra web no debería poder cerrarte la sesión.
    async logout(req, res) {
      await destruirSesion(req);
      res.clearCookie(NOMBRE_COOKIE_SESION, opcionesCookieSesion(config));
      res.redirect(303, "/login?sesion=cerrada");
    },

    // GET /perfil (protegido con exigirLogin en la ruta)
    async perfil(req, res) {
      const reservas = await servicioReservas.listarDeUsuario(req.usuario.id);
      // req.usuario ya viene SIN passwordHash (lo quitó el servicio).
      res.render("perfil", {
        titulo: "Mi perfil",
        usuario: req.usuario,
        totalActivas: reservas.filter((r) => r.estado === "activa").length,
        totalCanceladas: reservas.filter((r) => r.estado === "cancelada").length,
      });
    },
  };
}
