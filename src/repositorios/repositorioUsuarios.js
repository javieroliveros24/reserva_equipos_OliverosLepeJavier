// Repositorio de usuarios. Aquí sí guardamos el passwordHash, porque hace falta
// para comprobar el login, pero ese campo NUNCA sale hacia las vistas:
// el servicio se encarga de quitarlo antes.

import { ErrorDominio } from "../errores/ErrorDominio.js";

export function crearRepositorioUsuarios(iniciales = []) {
  const datos = new Map();
  for (const usuario of iniciales) {
    datos.set(usuario.id, { ...usuario });
  }

  function siguienteId() {
    let mayor = 0;
    for (const id of datos.keys()) {
      if (id > mayor) mayor = id;
    }
    return mayor + 1;
  }

  function buscarEmail(email) {
    return [...datos.values()].find((u) => u.email === email);
  }

  return {
    async buscarPorId(id) {
      const usuario = datos.get(id);
      return usuario ? { ...usuario } : undefined;
    },

    async buscarPorEmail(email) {
      const usuario = buscarEmail(email);
      return usuario ? { ...usuario } : undefined;
    },

    async crear(nuevo) {
      // Volvemos a comprobar el correo justo antes de guardar. Es como el
      // "UNIQUE" de una base de datos: aunque el servicio ya lo miró, si dos
      // registros con el mismo correo llegan casi a la vez, aquí se para el segundo.
      if (buscarEmail(nuevo.email)) {
        throw new ErrorDominio("EMAIL_DUPLICADO", "Ya existe una cuenta con ese correo.");
      }
      const usuario = { ...nuevo, id: siguienteId() };
      datos.set(usuario.id, usuario);
      return { ...usuario };
    },
  };
}
