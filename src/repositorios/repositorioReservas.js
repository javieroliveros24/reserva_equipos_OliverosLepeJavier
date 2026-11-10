// Repositorio de reservas. Igual que el de equipos: guarda los datos en un Map
// y siempre trabaja con copias para que nadie cambie el almacén "por accidente".
//
// Fíjate en que aquí NO hay reglas de negocio (si está ocupado, si es tuya...).
// Eso lo decide el servicio. El repositorio solo guarda y recupera.

export function crearRepositorioReservas(iniciales = []) {
  const datos = new Map();
  for (const reserva of iniciales) {
    datos.set(reserva.id, { ...reserva });
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
      return [...datos.values()].map((reserva) => ({ ...reserva }));
    },

    async listarPorUsuario(usuarioId) {
      return [...datos.values()]
        .filter((reserva) => reserva.usuarioId === usuarioId)
        .map((reserva) => ({ ...reserva }));
    },

    async buscarPorId(id) {
      const reserva = datos.get(id);
      return reserva ? { ...reserva } : undefined;
    },

    async crear(nueva) {
      const reserva = { ...nueva, id: siguienteId() };
      datos.set(reserva.id, reserva);
      return { ...reserva };
    },

    // Las reservas no se borran nunca: al cancelar, el servicio cambia el estado
    // y llama a guardar().
    async guardar(reserva) {
      if (!datos.has(reserva.id)) {
        throw new Error("No se puede guardar una reserva que no existe");
      }
      datos.set(reserva.id, { ...reserva });
    },
  };
}
