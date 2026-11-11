// Pequeña demostración del núcleo tipado. Se ejecuta con: npm run ts:demo
// Comprueba los casos importantes y escribe el resultado por consola.

import type { Equipo, Reserva, UsuarioActual } from "./modelos.js";
import { ErrorDominio } from "./errores.js";
import { RepositorioEquiposMemoria, RepositorioReservasMemoria } from "./repositorios.js";
import { ServicioReservas } from "./servicioReservas.js";
import { validarReserva } from "./reglas.js";

const equipos: Equipo[] = [
  { id: 1, codigo: "PC-001", nombre: "Ordenador aula 1", tipo: "sobremesa", estado: "operativo" },
  { id: 2, codigo: "PORT-001", nombre: "Portátil Lenovo", tipo: "portatil", estado: "operativo" },
  { id: 3, codigo: "PC-002", nombre: "Ordenador aula 2", tipo: "sobremesa", estado: "fuera_de_servicio" },
];

const reservas: Reserva[] = [
  { id: 1, equipoId: 1, usuarioId: 2, fecha: "2027-01-15", turno: "manana", estado: "activa" },
];

const ana: UsuarioActual = { id: 2, rol: "usuario" };
const luis: UsuarioActual = { id: 3, rol: "usuario" };

const repoReservas = new RepositorioReservasMemoria(reservas);
const servicio = new ServicioReservas(repoReservas, new RepositorioEquiposMemoria(equipos), () => "2026-11-10");

function comprobar(condicion: boolean, texto: string): void {
  console.log(`${condicion ? "OK   " : "FALLO"} ${texto}`);
  if (!condicion) process.exitCode = 1;
}

// Ejecuta una operación que debería fallar y devuelve el código de error.
async function codigoDeError(operacion: () => Promise<unknown>): Promise<string> {
  try {
    await operacion();
    return "SIN_ERROR";
  } catch (error) {
    return error instanceof ErrorDominio ? error.codigo : "ERROR_INESPERADO";
  }
}

const libres = await servicio.disponibles("2027-01-15", "manana");
comprobar(libres.map((e) => e.id).join(",") === "2", "Por la mañana del 15/01 solo está libre el equipo 2");

const validacion = validarReserva({ equipoId: "abc", fecha: "2027-01-15", turno: "noche" }, "2026-11-10");
comprobar(!validacion.ok, "validarReserva rechaza un id y un turno incorrectos");

const conflicto = await codigoDeError(() => servicio.crear(luis, { equipoId: 1, fecha: "2027-01-15", turno: "manana" }));
comprobar(conflicto === "EQUIPO_RESERVADO", `Reservar un hueco ocupado da ${conflicto}`);

const ajena = await codigoDeError(() => servicio.cancelar(1, luis));
comprobar(ajena === "SIN_PERMISO", `Luis intenta cancelar la reserva de Ana: ${ajena}`);
comprobar((await repoReservas.buscarPorId(1))?.estado === "activa", "Tras el rechazo la reserva sigue activa");

const cancelada = await servicio.cancelar(1, ana);
comprobar(cancelada.estado === "cancelada", "Ana cancela su propia reserva");

const nueva = await servicio.crear(luis, { equipoId: 1, fecha: "2027-01-15", turno: "manana" });
comprobar(nueva.usuarioId === 3, "Con la reserva cancelada, Luis puede reservar el mismo hueco");

const fuera = await codigoDeError(() => servicio.crear(ana, { equipoId: 3, fecha: "2027-01-20", turno: "tarde" }));
comprobar(fuera === "EQUIPO_NO_OPERATIVO", `Reservar un equipo fuera de servicio da ${fuera}`);
