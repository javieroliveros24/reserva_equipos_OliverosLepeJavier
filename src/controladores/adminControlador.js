// Controlador de administración. Todas sus rutas pasan antes por exigirRol("admin"),
// así que aquí ya sabemos que quien llama es un administrador.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import { estadoHttp } from "../errores/estadosHttp.js";
import { TIPOS_EQUIPO } from "../dominio/reglas.js";
import { enteroPositivo, texto } from "../utilidades/validacion.js";
import { guardarSesion } from "../middleware/sesion.js";

// Valida los datos del formulario "Añadir equipo".
// El código lo pasamos a mayúsculas: "pc-010" y "PC-010" son el mismo equipo.
function validarNuevoEquipo(body = {}) {
  const errores = {};
  const valores = {};

  const codigo = texto(body.codigo).toUpperCase();
  if (/^[A-Z]{2,6}-\d{3}$/.test(codigo)) valores.codigo = codigo;
  else errores.codigo = "El código debe tener el formato LETRAS-000 (por ejemplo, PORT-003).";

  const nombre = texto(body.nombre);
  if (nombre.length >= 3 && nombre.length <= 80) valores.nombre = nombre;
  else errores.nombre = "El nombre debe tener entre 3 y 80 caracteres.";

  if (TIPOS_EQUIPO.includes(body.tipo)) valores.tipo = body.tipo;
  else errores.tipo = "Elige si es sobremesa o portátil.";

  return { valido: Object.keys(errores).length === 0, errores, valores };
}

export function crearControladorAdmin(servicioEquipos, servicioReservas) {
  async function pintarEquipos(res, estado, valores = {}, errores = []) {
    const equipos = await servicioEquipos.listar();
    res.status(estado).render("admin/equipos", {
      titulo: "Administrar equipos",
      equipos,
      valores: { codigo: valores.codigo ?? "", nombre: valores.nombre ?? "", tipo: valores.tipo ?? "" },
      errores,
    });
  }

  return {
    // GET /admin/equipos
    async equipos(req, res) {
      await pintarEquipos(res, 200);
    },

    // POST /admin/equipos
    async crearEquipo(req, res) {
      const { valido, errores, valores } = validarNuevoEquipo(req.body);
      if (!valido) {
        return pintarEquipos(res, 400, valores, Object.values(errores));
      }

      let equipo;
      try {
        equipo = await servicioEquipos.crear(valores);
      } catch (error) {
        if (error instanceof ErrorDominio && error.codigo === "CODIGO_DUPLICADO") {
          return pintarEquipos(res, estadoHttp(error.codigo), { ...valores, codigo: "" }, [error.message]);
        }
        throw error;
      }

      req.session.aviso = `Equipo ${equipo.codigo} añadido.`;
      await guardarSesion(req);
      res.redirect(303, "/admin/equipos");
    },

    // POST /admin/equipos/:id/estado
    async cambiarEstado(req, res) {
      const id = enteroPositivo(req.params.id);
      const estado = req.body?.estado; // el servicio comprueba que sea un estado válido
      const equipo = await servicioEquipos.cambiarEstado(id, estado);

      req.session.aviso = `El equipo ${equipo.codigo} ahora está ${equipo.estado === "operativo" ? "operativo" : "fuera de servicio"}.`;
      await guardarSesion(req);
      res.redirect(303, "/admin/equipos");
    },

    // GET /admin/reservas
    async reservas(req, res) {
      const reservas = await servicioReservas.listarTodas();
      res.render("admin/reservas", { titulo: "Todas las reservas", reservas });
    },

    // POST /admin/reservas/:id/cancelar
    async cancelarReserva(req, res) {
      const id = enteroPositivo(req.params.id);
      await servicioReservas.cancelar(id, req.usuario); // como es admin, puede cancelar cualquiera activa
      req.session.aviso = `Reserva n.º ${id} cancelada.`;
      await guardarSesion(req);
      res.redirect(303, "/admin/reservas");
    },
  };
}
