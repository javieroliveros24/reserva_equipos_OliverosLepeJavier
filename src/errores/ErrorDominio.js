// Un ErrorDominio representa algo que "puede pasar" según las reglas del negocio:
// el equipo ya está reservado, la reserva no es tuya, el equipo no existe...
// No es un fallo del programa, es una situación prevista.
//
// El código (EQUIPO_RESERVADO, NO_ENCONTRADO...) es lo que mira el middleware de
// errores para decidir el código HTTP. Así los servicios no saben nada de HTTP:
// solo dicen QUÉ ha pasado, y otra capa decide CÓMO se responde.

export class ErrorDominio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.codigo = codigo;
  }
}
