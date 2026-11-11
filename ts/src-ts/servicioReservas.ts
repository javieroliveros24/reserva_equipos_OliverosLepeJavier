// Servicio de reservas tipado. Recibe los repositorios por el constructor
// (inyección de dependencias): no crea él el Map ni sabe cómo se guardan los datos.

import type { DatosReserva, Equipo, Reserva, Turno, UsuarioActual } from "./modelos.js";
import type { RepositorioEquipos, RepositorioReservas } from "./repositorios.js";
import { ErrorDominio } from "./errores.js";
import { estaReservado, obtenerEquiposDisponibles } from "./reglas.js";

export class ServicioReservas {
  private readonly reservas: RepositorioReservas;
  private readonly equipos: RepositorioEquipos;
  private readonly hoy: () => string;

  constructor(reservas: RepositorioReservas, equipos: RepositorioEquipos, hoy: () => string) {
    this.reservas = reservas;
    this.equipos = equipos;
    this.hoy = hoy;
  }

  async disponibles(fecha: string, turno: Turno): Promise<Equipo[]> {
    const [equipos, reservas] = await Promise.all([this.equipos.listar(), this.reservas.listar()]);
    return obtenerEquiposDisponibles(equipos, reservas, fecha, turno);
  }

  async crear(usuario: UsuarioActual, datos: DatosReserva): Promise<Reserva> {
    if (datos.fecha < this.hoy()) {
      throw new ErrorDominio("DATOS_INVALIDOS", "La fecha ya ha pasado.");
    }
    const equipo = await this.equipos.buscarPorId(datos.equipoId);
    if (equipo === undefined) {
      throw new ErrorDominio("NO_ENCONTRADO", "El equipo no existe.");
    }
    if (equipo.estado !== "operativo") {
      throw new ErrorDominio("EQUIPO_NO_OPERATIVO", "El equipo está fuera de servicio.");
    }
    const reservas = await this.reservas.listar();
    if (estaReservado(datos.equipoId, datos.fecha, datos.turno, reservas)) {
      throw new ErrorDominio("EQUIPO_RESERVADO", "Ya hay una reserva activa para ese equipo, fecha y turno.");
    }
    return this.reservas.crear({ ...datos, usuarioId: usuario.id, estado: "activa" });
  }

  async deUsuario(usuarioId: number): Promise<Reserva[]> {
    const reservas = await this.reservas.listar();
    return reservas.filter((r) => r.usuarioId === usuarioId);
  }

  async cancelar(reservaId: number, usuario: UsuarioActual): Promise<Reserva> {
    const reserva = await this.reservas.buscarPorId(reservaId);
    if (reserva === undefined) {
      throw new ErrorDominio("NO_ENCONTRADO", "La reserva no existe.");
    }
    const esAdmin = usuario.rol === "admin";
    if (!esAdmin && reserva.usuarioId !== usuario.id) {
      throw new ErrorDominio("SIN_PERMISO", "No puedes cancelar una reserva de otra persona.");
    }
    if (reserva.estado !== "activa") {
      throw new ErrorDominio("RESERVA_CANCELADA", "La reserva ya estaba cancelada.");
    }
    if (!esAdmin && reserva.fecha < this.hoy()) {
      throw new ErrorDominio("RESERVA_PASADA", "La reserva es de un día que ya ha pasado.");
    }
    const cancelada: Reserva = { ...reserva, estado: "cancelada" };
    await this.reservas.guardar(cancelada);
    return cancelada;
  }
}
