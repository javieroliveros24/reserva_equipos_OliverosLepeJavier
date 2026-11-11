// Tipos del dominio. Con los tipos unión, TypeScript solo deja usar los valores
// de la lista: si escribes turno: "noche", el compilador da error.
// Ojo: esto solo existe mientras programamos. Al compilar a JavaScript los tipos
// desaparecen, así que lo que llega del navegador hay que seguir validándolo.

export type Rol = "usuario" | "admin";
export type Turno = "manana" | "tarde";
export type EstadoReserva = "activa" | "cancelada";
export type EstadoEquipo = "operativo" | "fuera_de_servicio";
export type TipoEquipo = "sobremesa" | "portatil";

export interface Equipo {
  readonly id: number;
  codigo: string;
  nombre: string;
  tipo: TipoEquipo;
  estado: EstadoEquipo;
}

export interface Reserva {
  readonly id: number;
  equipoId: number;
  usuarioId: number;
  fecha: string; // formato AAAA-MM-DD
  turno: Turno;
  estado: EstadoReserva;
}

export interface Usuario {
  readonly id: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}

// Lo que el servicio necesita saber de quien hace la petición: su id y su rol.
// Siempre debe venir del servidor (la sesión), nunca del formulario.
export type UsuarioActual = Pick<Usuario, "id" | "rol">;

// Una reserva antes de guardarse todavía no tiene id: lo pone el repositorio.
export type NuevaReserva = Omit<Reserva, "id">;

// Datos que el usuario elige en el formulario, ya validados.
export interface DatosReserva {
  equipoId: number;
  fecha: string;
  turno: Turno;
}
