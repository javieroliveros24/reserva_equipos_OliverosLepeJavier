// Pequeñas funciones para mostrar los datos "bonitos" en las vistas.
// Solo transforman texto: no deciden nada ni consultan datos.
// Se registran en app.locals, así que se pueden usar en cualquier .ejs.

const TURNOS = { manana: "Mañana", tarde: "Tarde" };
const TIPOS = { sobremesa: "Sobremesa", portatil: "Portátil" };
const ESTADOS_EQUIPO = { operativo: "Operativo", fuera_de_servicio: "Fuera de servicio" };
const ESTADOS_RESERVA = { activa: "Activa", cancelada: "Cancelada" };

export function etiquetaTurno(turno) {
  return TURNOS[turno] ?? turno;
}

export function etiquetaTipo(tipo) {
  return TIPOS[tipo] ?? tipo;
}

export function etiquetaEstadoEquipo(estado) {
  return ESTADOS_EQUIPO[estado] ?? estado;
}

export function etiquetaEstadoReserva(estado) {
  return ESTADOS_RESERVA[estado] ?? estado;
}

// "2027-01-15" -> "15/01/2027"
export function formatearFecha(fecha) {
  if (typeof fecha !== "string") return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export const helpers = {
  etiquetaTurno,
  etiquetaTipo,
  etiquetaEstadoEquipo,
  etiquetaEstadoReserva,
  formatearFecha,
};
