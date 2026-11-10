// Tabla que traduce cada código de error del dominio a un código HTTP.
// Está separada de los servicios a propósito: el servicio dice "EQUIPO_RESERVADO"
// y es esta tabla la que decide que eso es un 409 Conflict.

const ESTADO_HTTP = {
  DATOS_INVALIDOS: 400, // el formulario o la URL traen datos mal
  CREDENCIALES_INVALIDAS: 401, // login incorrecto
  SIN_PERMISO: 403, // estás identificado, pero no puedes hacer eso
  CSRF_INVALIDO: 403, // el formulario no trae el token correcto
  NO_ENCONTRADO: 404, // no existe ese equipo o esa reserva
  EQUIPO_RESERVADO: 409, // ya hay otra reserva en ese hueco
  EQUIPO_NO_OPERATIVO: 409, // el equipo está fuera de servicio
  EMAIL_DUPLICADO: 409, // ya hay una cuenta con ese correo
  CODIGO_DUPLICADO: 409, // ya hay un equipo con ese código
  RESERVA_CANCELADA: 409, // intentas cancelar algo ya cancelado
  RESERVA_PASADA: 409, // intentas cancelar algo de un día que ya pasó
};

export function estadoHttp(codigo) {
  return ESTADO_HTTP[codigo] ?? 500;
}
