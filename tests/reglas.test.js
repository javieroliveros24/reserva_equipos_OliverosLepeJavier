// Pruebas de las funciones puras y del servicio de reservas.
// No hace falta Express: probamos la lógica directamente.

import { describe, it, expect } from "vitest";
import {
  estaReservado,
  obtenerEquiposDisponibles,
  validarReserva,
} from "../src/dominio/reglas.js";
import { enteroPositivo } from "../src/utilidades/validacion.js";
import { crearRepositorioEquipos } from "../src/repositorios/repositorioEquipos.js";
import { crearRepositorioReservas } from "../src/repositorios/repositorioReservas.js";
import { crearServicioReservas } from "../src/servicios/servicioReservas.js";

const HOY = "2026-11-10";
const hoy = () => HOY;

const equipos = [
  { id: 1, codigo: "PC-001", nombre: "PC 1", tipo: "sobremesa", estado: "operativo" },
  { id: 2, codigo: "PORT-001", nombre: "Portátil", tipo: "portatil", estado: "operativo" },
  { id: 3, codigo: "PC-002", nombre: "PC 2", tipo: "sobremesa", estado: "fuera_de_servicio" },
];

const reservas = [
  { id: 1, equipoId: 1, usuarioId: 2, fecha: "2027-01-15", turno: "manana", estado: "activa" },
  { id: 2, equipoId: 2, usuarioId: 3, fecha: "2027-01-15", turno: "manana", estado: "cancelada" },
];

describe("enteroPositivo", () => {
  it("solo acepta enteros positivos escritos como texto", () => {
    expect(enteroPositivo("7")).toBe(7);
    for (const malo of ["0", "01", "2.5", " 7", "-2", "7x", undefined, ["7"], "9007199254740992"]) {
      expect(() => enteroPositivo(malo)).toThrow();
    }
  });
});

describe("estaReservado", () => {
  it("detecta una reserva activa en el mismo hueco", () => {
    expect(estaReservado(1, "2027-01-15", "manana", reservas)).toBe(true);
  });
  it("el mismo equipo por la tarde está libre", () => {
    expect(estaReservado(1, "2027-01-15", "tarde", reservas)).toBe(false);
  });
  it("una reserva cancelada no bloquea el hueco", () => {
    expect(estaReservado(2, "2027-01-15", "manana", reservas)).toBe(false);
  });
});

describe("obtenerEquiposDisponibles", () => {
  it("quita los reservados y los que están fuera de servicio", () => {
    const libres = obtenerEquiposDisponibles(equipos, reservas, "2027-01-15", "manana");
    expect(libres.map((e) => e.id)).toEqual([2]);
  });
  it("por la tarde el equipo 1 vuelve a estar disponible", () => {
    const libres = obtenerEquiposDisponibles(equipos, reservas, "2027-01-15", "tarde");
    expect(libres.map((e) => e.id)).toEqual([1, 2]);
  });
});

describe("validarReserva", () => {
  it("acepta datos correctos y convierte el id a número", () => {
    const r = validarReserva({ equipoId: "2", fecha: "2027-01-15", turno: "tarde" }, HOY);
    expect(r.valido).toBe(true);
    expect(r.valores).toEqual({ equipoId: 2, fecha: "2027-01-15", turno: "tarde" });
  });
  it("rechaza fecha pasada, fecha imposible y turno inventado", () => {
    expect(validarReserva({ equipoId: "1", fecha: "2026-01-01", turno: "manana" }, HOY).errores.fecha).toBeDefined();
    expect(validarReserva({ equipoId: "1", fecha: "2027-02-30", turno: "manana" }, HOY).errores.fecha).toBeDefined();
    expect(validarReserva({ equipoId: "1", fecha: "2027-01-15", turno: "noche" }, HOY).errores.turno).toBeDefined();
  });
  it("conserva solo los campos válidos", () => {
    const r = validarReserva({ equipoId: "abc", fecha: "2027-01-15", turno: "tarde" }, HOY);
    expect(r.valido).toBe(false);
    expect(r.valores).toEqual({ fecha: "2027-01-15", turno: "tarde" });
  });
});

describe("servicio de reservas", () => {
  // Cada prueba crea sus propios repositorios para no depender de las demás.
  function crearServicio() {
    const repoEquipos = crearRepositorioEquipos(equipos);
    const repoReservas = crearRepositorioReservas(reservas);
    const repoUsuarios = { async buscarPorId() { return undefined; } }; // no se usa aquí
    return { servicio: crearServicioReservas(repoReservas, repoEquipos, repoUsuarios, hoy), repoReservas };
  }
  const ana = { id: 2, rol: "usuario" };
  const luis = { id: 3, rol: "usuario" };
  const admin = { id: 1, rol: "admin" };

  it("crea una reserva con el usuario recibido", async () => {
    const { servicio } = crearServicio();
    const reserva = await servicio.crear(luis, { equipoId: 2, fecha: "2027-01-15", turno: "manana" });
    expect(reserva).toMatchObject({ usuarioId: 3, estado: "activa" });
  });

  it("no permite reservar un hueco ocupado", async () => {
    const { servicio } = crearServicio();
    await expect(
      servicio.crear(luis, { equipoId: 1, fecha: "2027-01-15", turno: "manana" })
    ).rejects.toMatchObject({ codigo: "EQUIPO_RESERVADO" });
  });

  it("dos reservas simultáneas del mismo hueco: solo una sale bien", async () => {
    const { servicio } = crearServicio();
    const datos = { equipoId: 2, fecha: "2027-03-01", turno: "tarde" };
    const resultados = await Promise.allSettled([servicio.crear(ana, datos), servicio.crear(luis, datos)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("rechaza equipos fuera de servicio o inexistentes", async () => {
    const { servicio } = crearServicio();
    await expect(servicio.crear(ana, { equipoId: 3, fecha: "2027-01-15", turno: "tarde" }))
      .rejects.toMatchObject({ codigo: "EQUIPO_NO_OPERATIVO" });
    await expect(servicio.crear(ana, { equipoId: 99, fecha: "2027-01-15", turno: "tarde" }))
      .rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });

  it("un usuario no puede cancelar la reserva de otro, pero sí la suya", async () => {
    const { servicio, repoReservas } = crearServicio();
    await expect(servicio.cancelar(1, luis)).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
    expect((await repoReservas.buscarPorId(1)).estado).toBe("activa"); // no ha cambiado
    await servicio.cancelar(1, ana);
    expect((await repoReservas.buscarPorId(1)).estado).toBe("cancelada"); // no se borra
  });

  it("tras cancelar, otro usuario puede reservar el mismo hueco", async () => {
    const { servicio } = crearServicio();
    await servicio.cancelar(1, admin);
    const nueva = await servicio.crear(luis, { equipoId: 1, fecha: "2027-01-15", turno: "manana" });
    expect(nueva.usuarioId).toBe(3);
  });
});

describe("repositorio", () => {
  it("trabaja con copias: cambiar lo recuperado no cambia el almacén", async () => {
    const iniciales = [{ ...equipos[0] }];
    const repo = crearRepositorioEquipos(iniciales);
    const recuperado = await repo.buscarPorId(1);
    recuperado.estado = "fuera_de_servicio";
    iniciales[0].nombre = "Cambiado fuera";
    const otraVez = await repo.buscarPorId(1);
    expect(otraVez.estado).toBe("operativo");
    expect(otraVez.nombre).toBe("PC 1");
  });
});
