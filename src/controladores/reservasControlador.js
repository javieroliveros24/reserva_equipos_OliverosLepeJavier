// Controlador de reservas del usuario: formulario, crear, listar y cancelar.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import { estadoHttp } from "../errores/estadosHttp.js";
import { validarFechaYTurno, validarReserva } from "../dominio/reglas.js";
import { enteroPositivo } from "../utilidades/validacion.js";
import { guardarSesion } from "../middleware/sesion.js";
import { crearVMReserva } from "../vistas/formularioReserva.js";
import { etiquetaTurno, formatearFecha } from "../vistas/helpers.js";

// Errores del servicio que se enseñan dentro del propio formulario
// (en vez de en la página genérica de error).
const ERRORES_DEL_FORMULARIO = [
  "DATOS_INVALIDOS",
  "NO_ENCONTRADO",
  "EQUIPO_NO_OPERATIVO",
  "EQUIPO_RESERVADO",
];

export function crearControladorReservas(servicioReservas, hoy) {
  // Vuelve a pintar el formulario con los valores que estaban bien.
  // Si fecha y turno eran válidos, recalculamos los equipos libres en ese momento.
  async function pintarFormulario(res, estado, valores, errores) {
    const fecha = valores.fecha ?? "";
    const turno = valores.turno ?? "";
    const equipos = fecha && turno ? await servicioReservas.equiposDisponibles(fecha, turno) : [];

    const vm = crearVMReserva({
      fecha,
      turno,
      equipos,
      equipoSeleccionado: valores.equipoId ?? "",
      errores,
      csrfToken: res.locals.csrfToken,
      hoy: hoy(),
    });
    res.status(estado).render("reservas/nueva", { vm });
  }

  return {
    // GET /reservas/nueva  y  GET /reservas/nueva?fecha=2027-01-15&turno=tarde
    // Si no se indica nada, mostramos los equipos libres de hoy por la mañana.
    // Para cambiar de fecha o turno se hace una nueva petición GET (sin JavaScript).
    async mostrarFormulario(req, res) {
      const hayConsulta = req.query.fecha !== undefined || req.query.turno !== undefined;
      const datos = hayConsulta
        ? { fecha: req.query.fecha, turno: req.query.turno }
        : { fecha: hoy(), turno: "manana" };

      const { valido, errores, valores } = validarFechaYTurno(datos, hoy());
      await pintarFormulario(res, valido ? 200 : 400, valores, errores);
    },

    // POST /reservas
    // Aunque el formulario solo ofrezca equipos libres, aquí lo comprobamos
    // TODO otra vez: alguien puede modificar el HTML o mandar la petición a mano,
    // o el equipo pudo ocuparse entre que cargó la página y pulsó el botón.
    async crear(req, res) {
      const body = req.body ?? {};
      const resultado = validarReserva(
        { equipoId: body.equipoId, fecha: body.fecha, turno: body.turno },
        hoy()
      );

      if (!resultado.valido) {
        return pintarFormulario(res, 400, resultado.valores, resultado.errores);
      }

      let reserva;
      try {
        // El usuario sale de req.usuario (cargado desde la sesión), no del formulario.
        reserva = await servicioReservas.crear(req.usuario, resultado.valores);
      } catch (error) {
        if (error instanceof ErrorDominio && ERRORES_DEL_FORMULARIO.includes(error.codigo)) {
          // Conservamos fecha y turno; el equipo solo si no era él el problema.
          const valores = { fecha: resultado.valores.fecha, turno: resultado.valores.turno };
          return pintarFormulario(res, estadoHttp(error.codigo), valores, { general: error.message });
        }
        throw error;
      }

      // Patrón PRG: guardamos el aviso en la sesión, esperamos a que se guarde
      // y redirigimos con 303. Si el usuario recarga la página de destino,
      // no se vuelve a enviar el formulario.
      req.session.aviso =
        `Reserva confirmada para el ${formatearFecha(reserva.fecha)}, ` +
        `turno de ${etiquetaTurno(reserva.turno).toLowerCase()}.`;
      await guardarSesion(req);
      res.redirect(303, "/mis-reservas");
    },

    // GET /mis-reservas
    async misReservas(req, res) {
      const reservas = await servicioReservas.listarDeUsuario(req.usuario.id);
      res.render("reservas/mis-reservas", { titulo: "Mis reservas", reservas });
    },

    // POST /reservas/:id/cancelar
    // Los errores (no existe, no es tuya, ya cancelada...) los lanza el servicio
    // y los pinta el manejador central con su código HTTP.
    async cancelar(req, res) {
      const id = enteroPositivo(req.params.id);
      await servicioReservas.cancelar(id, req.usuario);
      req.session.aviso = "Reserva cancelada.";
      await guardarSesion(req);
      res.redirect(303, "/mis-reservas");
    },
  };
}
