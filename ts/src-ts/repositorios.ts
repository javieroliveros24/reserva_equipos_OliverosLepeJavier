// Contratos (interfaces) de los repositorios y una implementación con Map.
// El servicio solo conoce la interfaz, no la clase. Así podemos cambiar el Map
// por una base de datos (o por un repositorio falso en las pruebas) sin tocarlo.

import type { Equipo, NuevaReserva, Reserva } from "./modelos.js";

export interface RepositorioReservas {
  listar(): Promise<Reserva[]>;
  buscarPorId(id: number): Promise<Reserva | undefined>; // puede no existir
  crear(datos: NuevaReserva): Promise<Reserva>;
  guardar(reserva: Reserva): Promise<void>; // no devuelve nada útil
}

export interface RepositorioEquipos {
  listar(): Promise<Equipo[]>;
  buscarPorId(id: number): Promise<Equipo | undefined>;
}

export class RepositorioReservasMemoria implements RepositorioReservas {
  // "readonly" impide cambiar a qué Map apunta "datos", pero SÍ deja hacer datos.set().
  // "private" lo comprueba TypeScript; en el JavaScript compilado sigue siendo accesible.
  private readonly datos = new Map<number, Reserva>();

  constructor(iniciales: readonly Reserva[] = []) {
    for (const reserva of iniciales) {
      this.datos.set(reserva.id, { ...reserva }); // copia al entrar
    }
  }

  async listar(): Promise<Reserva[]> {
    return [...this.datos.values()].map((r) => ({ ...r })); // copias al salir
  }

  async buscarPorId(id: number): Promise<Reserva | undefined> {
    const reserva = this.datos.get(id);
    return reserva ? { ...reserva } : undefined;
  }

  async crear(datos: NuevaReserva): Promise<Reserva> {
    const reserva: Reserva = { ...datos, id: this.siguienteId() };
    this.datos.set(reserva.id, reserva);
    return { ...reserva };
  }

  async guardar(reserva: Reserva): Promise<void> {
    if (!this.datos.has(reserva.id)) {
      throw new Error("No se puede guardar una reserva que no existe");
    }
    this.datos.set(reserva.id, { ...reserva });
  }

  private siguienteId(): number {
    let mayor = 0;
    for (const id of this.datos.keys()) {
      if (id > mayor) mayor = id;
    }
    return mayor + 1;
  }
}

export class RepositorioEquiposMemoria implements RepositorioEquipos {
  private readonly datos = new Map<number, Equipo>();

  constructor(iniciales: readonly Equipo[] = []) {
    for (const equipo of iniciales) {
      this.datos.set(equipo.id, { ...equipo });
    }
  }

  async listar(): Promise<Equipo[]> {
    return [...this.datos.values()].map((e) => ({ ...e }));
  }

  async buscarPorId(id: number): Promise<Equipo | undefined> {
    const equipo = this.datos.get(id);
    return equipo ? { ...equipo } : undefined;
  }
}
