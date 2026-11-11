// Modelo de vista (VM) del formulario de reservas.
//
// La idea: el controlador no le pasa a la vista "todo lo que tiene", sino un
// objeto ya preparado con exactamente lo que hay que pintar (opciones de los
// select, qué opción va marcada, si se puede enviar, los errores...).
// Así la vista EJS queda sencilla y no tiene que tomar decisiones.
//
// Fíjate en que NO metemos el usuario completo ni la sesión: no hacen falta.

import { TURNOS } from "../dominio/reglas.js";
import { etiquetaTipo, etiquetaTurno, formatearFecha } from "./helpers.js";

export function crearVMReserva({
  fecha = "", // solo llega si es válida
  turno = "", // solo llega si es válido
  equipos = [], // equipos YA filtrados por el servicio (libres en ese hueco)
  equipoSeleccionado = "", // para volver a marcarlo si el formulario falla
  errores = {}, // { campo: "mensaje" }
  csrfToken,
  hoy,
}) {
  const consultaValida = fecha !== "" && turno !== "";

  const opcionesTurno = TURNOS.map((t) => ({
    valor: t,
    texto: etiquetaTurno(t),
    seleccionado: t === turno,
  }));

  // Los valores de un <select> siempre son texto, por eso pasamos el id a String.
  const opcionesEquipo = equipos.map((e) => ({
    valor: String(e.id),
    texto: `${e.codigo} · ${e.nombre} (${etiquetaTipo(e.tipo)})`,
    seleccionado: String(e.id) === String(equipoSeleccionado),
  }));

  return {
    titulo: "Nueva reserva",
    fecha,
    fechaMinima: hoy,
    opcionesTurno,
    opcionesEquipo,
    consultaValida,
    resumen: consultaValida
      ? `${formatearFecha(fecha)}, turno de ${etiquetaTurno(turno).toLowerCase()}`
      : "",
    turno,
    // Solo se puede enviar si la fecha/turno son válidos y queda algún equipo libre.
    puedeEnviar: consultaValida && opcionesEquipo.length > 0,
    errores: Object.values(errores),
    csrfToken,
  };
}
