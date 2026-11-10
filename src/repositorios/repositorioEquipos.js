// Repositorio de equipos: es la ÚNICA parte del programa que toca la colección.
// Hoy los datos están en un Map en memoria; si mañana usamos una base de datos,
// solo habría que cambiar este archivo y el resto de la aplicación ni se entera.
//
// Los métodos son async aunque ahora no haría falta, porque una base de datos
// real sí sería asíncrona. Así el resto del código ya está preparado.
//
// Importante: siempre devolvemos COPIAS ({ ...equipo }). Si alguien modifica
// el objeto que recibe, no cambia el almacén hasta que llame a guardar().

export function crearRepositorioEquipos(iniciales = []) {
  const datos = new Map();
  for (const equipo of iniciales) {
    datos.set(equipo.id, { ...equipo });
  }

  function siguienteId() {
    let mayor = 0;
    for (const id of datos.keys()) {
      if (id > mayor) mayor = id;
    }
    return mayor + 1;
  }

  return {
    async listar() {
      return [...datos.values()].map((equipo) => ({ ...equipo }));
    },

    async buscarPorId(id) {
      const equipo = datos.get(id);
      return equipo ? { ...equipo } : undefined;
    },

    async buscarPorCodigo(codigo) {
      const equipo = [...datos.values()].find((e) => e.codigo === codigo);
      return equipo ? { ...equipo } : undefined;
    },

    async crear(nuevo) {
      const equipo = { ...nuevo, id: siguienteId() };
      datos.set(equipo.id, equipo);
      return { ...equipo };
    },

    async guardar(equipo) {
      if (!datos.has(equipo.id)) {
        throw new Error("No se puede guardar un equipo que no existe");
      }
      datos.set(equipo.id, { ...equipo });
    },
  };
}
