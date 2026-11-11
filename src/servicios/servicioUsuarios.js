// Servicio de usuarios: registro, comprobación de credenciales y búsqueda.
// No sabe nada de req, res ni sesiones; solo de usuarios y contraseñas.

import bcrypt from "bcrypt";
import { ErrorDominio } from "../errores/ErrorDominio.js";
import { COSTE_BCRYPT } from "../datos/semilla.js";

// El mismo mensaje sirve para "ese correo no existe" y para "contraseña mal".
// Si fueran distintos, alguien podría averiguar qué correos están registrados.
export const MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos.";

// Lo que se puede enseñar de un usuario: todo MENOS el passwordHash.
export function aUsuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

export function crearServicioUsuarios(repoUsuarios) {
  // Un hash "de relleno". Si el correo no existe, comparamos igualmente contra
  // este hash para que la respuesta tarde lo mismo que con un correo real.
  // Si no lo hiciéramos, midiendo el tiempo se podría adivinar qué correos existen.
  const hashDeRelleno = bcrypt.hash("relleno-para-igualar-tiempos", COSTE_BCRYPT);

  return {
    // Los datos llegan ya validados por el controlador.
    async registrar({ nombre, email, password }) {
      const existente = await repoUsuarios.buscarPorEmail(email);
      if (existente) {
        throw new ErrorDominio("EMAIL_DUPLICADO", "Ya existe una cuenta con ese correo.");
      }

      const passwordHash = await bcrypt.hash(password, COSTE_BCRYPT);

      // El rol lo ponemos nosotros, SIEMPRE "usuario". Aunque alguien añada
      // rol=admin al formulario, ni siquiera lo leemos.
      const usuario = await repoUsuarios.crear({
        nombre,
        email,
        passwordHash,
        rol: "usuario",
      });
      return aUsuarioPublico(usuario);
    },

    async autenticar(email, password) {
      const usuario = await repoUsuarios.buscarPorEmail(email);
      const hash = usuario ? usuario.passwordHash : await hashDeRelleno;
      const coincide = await bcrypt.compare(password, hash);

      if (!usuario || !coincide) {
        throw new ErrorDominio("CREDENCIALES_INVALIDAS", MENSAJE_CREDENCIALES);
      }
      return aUsuarioPublico(usuario);
    },

    // Se usa en cada petición para saber quién es el usuario de la sesión.
    // Si el usuario ya no existe (lo borraron), devuelve null.
    async buscarPublico(id) {
      const usuario = await repoUsuarios.buscarPorId(id);
      return usuario ? aUsuarioPublico(usuario) : null;
    },
  };
}
