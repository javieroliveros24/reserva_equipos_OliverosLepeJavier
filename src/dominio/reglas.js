// Reglas básicas de las reservas, como funciones sueltas.
// No saben nada de Express (ni req ni res): reciben datos y devuelven datos.
// Por eso se pueden usar desde los servicios, desde los controladores
// y desde las pruebas sin montar ningún servidor.

import { esFechaValida, enteroPositivo } from "../utilidades/validacion.js";

export const TURNOS = ["manana", "tarde"];
export const TIPOS_EQUIPO = ["sobremesa", "portatil"];
export const ESTADOS_EQUIPO = ["operativo", "fuera_de_servicio"];

// ¿Hay ya una reserva ACTIVA de ese equipo ese día y en ese turno?
// Las canceladas no cuentan: si alguien cancela, el hueco vuelve a quedar libre.
export function estaReservado(equipoId, fecha, turno, reservas) {
  return reservas.some(
    (r) =>
      r.equipoId === equipoId &&
      r.fecha === fecha &&
      r.turno === turno &&
      r.estado === "activa"
  );
}

// Equipos que se pueden reservar para una fecha y turno concretos:
// tienen que estar operativos y no tener ya una reserva activa en ese hueco.
// Un mismo equipo puede estar libre por la mañana y ocupado por la tarde.
export function obtenerEquiposDisponibles(equipos, reservas, fecha, turno) {
  return equipos.filter(
    (equipo) =>
      equipo.estado === "operativo" &&
      !estaReservado(equipo.id, fecha, turno, reservas)
  );
}

// Valida solo la fecha y el turno. La usamos al consultar disponibilidad
// (GET /reservas/nueva) y también dentro de validarReserva.
export function validarFechaYTurno(datos = {}, hoy) {
  const errores = {};
  const valores = {};

  if (!esFechaValida(datos.fecha)) {
    errores.fecha = "La fecha no es válida.";
  } else if (datos.fecha < hoy) {
    errores.fecha = "No se puede reservar para un día que ya ha pasado.";
  } else {
    valores.fecha = datos.fecha;
  }

  if (typeof datos.turno === "string" && TURNOS.includes(datos.turno)) {
    valores.turno = datos.turno;
  } else {
    errores.turno = "Elige el turno de mañana o el de tarde.";
  }

  return { valido: Object.keys(errores).length === 0, errores, valores };
}

// Valida todos los datos de una reserva que llegan del formulario.
// Devuelve:
//   - valido: true/false
//   - errores: un mensaje por cada campo que esté mal
//   - valores: SOLO los campos correctos, ya convertidos (equipoId como número).
//     Así, si algo falla, podemos volver a pintar el formulario con lo que sí estaba bien.
export function validarReserva(datos = {}, hoy) {
  const { errores, valores } = validarFechaYTurno(datos, hoy);

  try {
    valores.equipoId = enteroPositivo(datos.equipoId);
  } catch {
    errores.equipoId = "Elige un equipo de la lista.";
  }

  return { valido: Object.keys(errores).length === 0, errores, valores };
}

// Un usuario normal solo puede cancelar reservas activas cuya fecha no haya pasado.
export function sePuedeCancelar(reserva, hoy) {
  return reserva.estado === "activa" && reserva.fecha >= hoy;
}
