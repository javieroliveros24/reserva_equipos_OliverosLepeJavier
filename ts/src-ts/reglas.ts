// Versión tipada de las funciones de reglas de la parte JavaScript.

import type { DatosReserva, Equipo, Reserva, Turno } from "./modelos.js";

export const TURNOS: readonly Turno[] = ["manana", "tarde"];

// "Guardas de tipo": funciones que comprueban un valor de tipo desconocido y,
// si devuelven true, TypeScript ya sabe de qué tipo es. Así no hace falta "as".
export function esTurno(valor: unknown): valor is Turno {
  return valor === "manana" || valor === "tarde";
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

export function esFechaValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (anio === undefined || mes === undefined || dia === undefined) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// Igual que enteroPositivo en JS. Fíjate en que recibe "unknown": no sabemos
// qué nos llega, y TypeScript nos obliga a comprobarlo antes de usarlo.
// Poner "valor as number" NO convertiría "7" en 7; solo engañaría al compilador.
export function convertirId(valor: unknown): number | null {
  if (typeof valor !== "string" || !/^[1-9]\d*$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : null;
}

export function estaReservado(
  equipoId: number,
  fecha: string,
  turno: Turno,
  reservas: readonly Reserva[]
): boolean {
  return reservas.some(
    (r) => r.equipoId === equipoId && r.fecha === fecha && r.turno === turno && r.estado === "activa"
  );
}

export function obtenerEquiposDisponibles(
  equipos: readonly Equipo[],
  reservas: readonly Reserva[],
  fecha: string,
  turno: Turno
): Equipo[] {
  return equipos.filter((e) => e.estado === "operativo" && !estaReservado(e.id, fecha, turno, reservas));
}

// El resultado es una "unión discriminada": si ok es true hay datos; si es
// false hay errores. TypeScript no nos deja leer "datos" sin mirar antes "ok".
export type ResultadoValidacion =
  | { ok: true; datos: DatosReserva }
  | { ok: false; errores: string[] };

export function validarReserva(entrada: unknown, hoy: string): ResultadoValidacion {
  if (!esObjeto(entrada)) return { ok: false, errores: ["No se han recibido datos."] };

  const equipoId = convertirId(entrada["equipoId"]);
  const fecha = entrada["fecha"];
  const turno = entrada["turno"];

  if (equipoId === null || !esFechaValida(fecha) || fecha < hoy || !esTurno(turno)) {
    const errores: string[] = [];
    if (equipoId === null) errores.push("El equipo no es válido.");
    if (!esFechaValida(fecha)) errores.push("La fecha no es válida.");
    else if (fecha < hoy) errores.push("La fecha ya ha pasado.");
    if (!esTurno(turno)) errores.push("El turno no es válido.");
    return { ok: false, errores };
  }

  // Aquí TypeScript ya sabe que equipoId es number, fecha es string y turno es Turno.
  return { ok: true, datos: { equipoId, fecha, turno } };
}
