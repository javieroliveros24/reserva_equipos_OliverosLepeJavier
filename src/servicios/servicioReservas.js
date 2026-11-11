// Servicio de reservas: aquí está el "corazón" de la práctica.
// Decide qué equipos están libres, si una reserva se puede hacer y quién puede
// cancelar qué. No usa req ni res: recibe datos normales (el usuario ya cargado
// del servidor, números, fechas) y devuelve datos o lanza un ErrorDominio.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import {
  TURNOS,
  estaReservado,
  obtenerEquiposDisponibles,
  sePuedeCancelar,
} from "../dominio/reglas.js";
import { esFechaValida, fechaDeHoy } from "../utilidades/validacion.js";

export function crearServicioReservas(repoReservas, repoEquipos, repoUsuarios, hoy = fechaDeHoy) {
  // --- Cola para operaciones que cambian reservas ---
  // Entre "compruebo que está libre" y "guardo la reserva" hay varios await.
  // Si dos personas reservan el mismo equipo a la vez, las dos podrían ver el
  // hueco libre y guardar las dos. Para evitarlo, ponemos las operaciones en
  // fila: la segunda no empieza hasta que termina la primera.
  // (Con una base de datos real esto se haría con una restricción única o una transacción).
  let cola = Promise.resolve();
  function enFila(tarea) {
    const resultado = cola.then(tarea);
    cola = resultado.catch(() => {}); // si una falla, la fila sigue funcionando
    return resultado;
  }

  // Añade a cada reserva el código y nombre del equipo, para enseñarlo en las vistas.
  async function conDatosDeEquipo(reservas) {
    const equipos = await repoEquipos.listar();
    return reservas.map((reserva) => {
      const equipo = equipos.find((e) => e.id === reserva.equipoId);
      return {
        ...reserva,
        equipoCodigo: equipo ? equipo.codigo : "¿?",
        equipoNombre: equipo ? equipo.nombre : "Equipo desconocido",
      };
    });
  }

  // Ordena de la más reciente a la más antigua (y mañana antes que tarde).
  function ordenar(reservas) {
    return reservas.sort(
      (a, b) => b.fecha.localeCompare(a.fecha) || TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno)
    );
  }

  return {
    // Equipos libres para una fecha y turno: los usa el formulario de reserva.
    async equiposDisponibles(fecha, turno) {
      const [equipos, reservas] = await Promise.all([repoEquipos.listar(), repoReservas.listar()]);
      return obtenerEquiposDisponibles(equipos, reservas, fecha, turno);
    },

    // Crea una reserva. "usuario" viene de la sesión (lo cargó el servidor),
    // nunca de un campo del formulario.
    crear(usuario, { equipoId, fecha, turno }) {
      return enFila(async () => {
        // El controlador ya validó, pero el servicio vuelve a mirar las reglas
        // importantes: así nadie puede saltárselas llamando al servicio desde otro sitio.
        if (!esFechaValida(fecha) || fecha < hoy()) {
          throw new ErrorDominio("DATOS_INVALIDOS", "No se puede reservar para un día que ya ha pasado.");
        }
        if (!TURNOS.includes(turno)) {
          throw new ErrorDominio("DATOS_INVALIDOS", "El turno no es válido.");
        }

        const equipo = await repoEquipos.buscarPorId(equipoId);
        if (!equipo) {
          throw new ErrorDominio("NO_ENCONTRADO", "El equipo solicitado no existe.");
        }
        if (equipo.estado !== "operativo") {
          throw new ErrorDominio("EQUIPO_NO_OPERATIVO", `El equipo ${equipo.codigo} está fuera de servicio.`);
        }

        const reservas = await repoReservas.listar();
        if (estaReservado(equipoId, fecha, turno, reservas)) {
          throw new ErrorDominio(
            "EQUIPO_RESERVADO",
            `El equipo ${equipo.codigo} ya está reservado para esa fecha y turno. Elige otro.`
          );
        }

        return repoReservas.crear({
          equipoId,
          usuarioId: usuario.id,
          fecha,
          turno,
          estado: "activa",
        });
      });
    },

    // Reservas de un usuario (activas y canceladas), con un campo puedeCancelar
    // para que la vista sepa si enseñar el botón.
    async listarDeUsuario(usuarioId) {
      const reservas = await conDatosDeEquipo(await repoReservas.listarPorUsuario(usuarioId));
      return ordenar(reservas).map((r) => ({ ...r, puedeCancelar: sePuedeCancelar(r, hoy()) }));
    },

    // Todas las reservas, con el nombre del usuario. Solo para administración.
    async listarTodas() {
      const reservas = await conDatosDeEquipo(await repoReservas.listar());
      const conUsuario = await Promise.all(
        reservas.map(async (r) => {
          const usuario = await repoUsuarios.buscarPorId(r.usuarioId);
          return { ...r, usuarioNombre: usuario ? usuario.nombre : "Usuario eliminado" };
        })
      );
      return ordenar(conUsuario);
    },

    // Cancelar una reserva. Las reglas cambian según quién lo pida:
    //   - Un usuario normal: solo SUS reservas, activas y que no hayan pasado.
    //   - Un admin: cualquier reserva activa.
    // La comprobación de "es tuya" se hace aquí, con el id de la sesión, así que
    // aunque alguien cambie el número en la URL no puede cancelar las de otro.
    cancelar(reservaId, usuario) {
      return enFila(async () => {
        const reserva = await repoReservas.buscarPorId(reservaId);
        if (!reserva) {
          throw new ErrorDominio("NO_ENCONTRADO", "La reserva no existe.");
        }

        const esAdmin = usuario.rol === "admin";
        if (!esAdmin && reserva.usuarioId !== usuario.id) {
          throw new ErrorDominio("SIN_PERMISO", "No puedes cancelar una reserva que no es tuya.");
        }
        if (reserva.estado !== "activa") {
          throw new ErrorDominio("RESERVA_CANCELADA", "Esa reserva ya estaba cancelada.");
        }
        if (!esAdmin && !sePuedeCancelar(reserva, hoy())) {
          throw new ErrorDominio("RESERVA_PASADA", "No se puede cancelar una reserva de un día que ya ha pasado.");
        }

        // No borramos: solo cambiamos el estado. Así queda el historial.
        reserva.estado = "cancelada";
        await repoReservas.guardar(reserva);
        return reserva;
      });
    },
  };
}
