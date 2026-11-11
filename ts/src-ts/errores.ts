// Error de dominio tipado: el código solo puede ser uno de esta lista.
// Si en el servicio escribimos un código que no existe, no compila.

export type CodigoError =
  | "DATOS_INVALIDOS"
  | "NO_ENCONTRADO"
  | "EQUIPO_NO_OPERATIVO"
  | "EQUIPO_RESERVADO"
  | "SIN_PERMISO"
  | "RESERVA_CANCELADA"
  | "RESERVA_PASADA";

export class ErrorDominio extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError, mensaje: string) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.codigo = codigo;
  }
}
