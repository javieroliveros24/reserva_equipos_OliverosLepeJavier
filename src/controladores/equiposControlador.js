// Controlador del catálogo público de equipos y de la cookie de preferencias.
// Los controladores hacen de "puente": leen la petición, validan y convierten
// los datos, llaman al servicio y deciden qué respuesta HTTP se envía.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import { TIPOS_EQUIPO } from "../dominio/reglas.js";
import { enteroPositivo } from "../utilidades/validacion.js";

export const COOKIE_PREFERENCIA = "tipoPreferido";
const TREINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

// Lee los filtros de la URL. Si no viene ?tipo=..., usamos la cookie de
// preferencia como filtro inicial. La cookie la puede cambiar cualquiera desde
// su navegador, así que la tratamos como "no fiable": si trae un valor raro,
// simplemente la ignoramos. Y nunca la usamos para decidir permisos.
function leerFiltros(query, cookiePreferencia) {
  let tipo = null;
  if (query.tipo === undefined) {
    if (TIPOS_EQUIPO.includes(cookiePreferencia)) tipo = cookiePreferencia;
  } else if (query.tipo === "todos") {
    tipo = null;
  } else if (TIPOS_EQUIPO.includes(query.tipo)) {
    tipo = query.tipo;
  } else {
    throw new ErrorDominio("DATOS_INVALIDOS", "El tipo de equipo del filtro no es válido.");
  }

  let soloOperativos = false;
  if (query.operativos === "true") soloOperativos = true;
  else if (query.operativos !== undefined && query.operativos !== "false") {
    throw new ErrorDominio("DATOS_INVALIDOS", "El filtro de operativos solo admite true o false.");
  }

  return { tipo, soloOperativos };
}

export function crearControladorEquipos(servicioEquipos, { esProduccion }) {
  return {
    // GET /equipos  (y variantes con ?tipo=...&operativos=true)
    async listar(req, res) {
      const preferencia = req.cookies[COOKIE_PREFERENCIA];
      const filtros = leerFiltros(req.query, preferencia);
      const equipos = await servicioEquipos.listar(filtros);

      res.render("equipos/lista", {
        titulo: "Equipos del centro",
        equipos,
        filtros: { tipo: filtros.tipo ?? "todos", operativos: filtros.soloOperativos },
        preferencia: TIPOS_EQUIPO.includes(preferencia) ? preferencia : "ninguna",
      });
    },

    // GET /equipos/:id
    async ficha(req, res) {
      const id = enteroPositivo(req.params.id); // "abc" o "-1" -> 400
      const { equipo, ocupados } = await servicioEquipos.obtenerFicha(id); // no existe -> 404
      res.render("equipos/ficha", { titulo: equipo.nombre, equipo, ocupados });
    },

    // POST /preferencias/tipo
    // Guarda en una cookie el tipo de equipo favorito (o la borra con "ninguna").
    guardarPreferencia(req, res) {
      const tipo = req.body?.tipo;
      const opciones = {
        httpOnly: true,
        sameSite: "lax",
        secure: esProduccion,
        path: "/",
      };

      if (tipo === "ninguna") {
        res.clearCookie(COOKIE_PREFERENCIA, opciones);
      } else if (TIPOS_EQUIPO.includes(tipo)) {
        res.cookie(COOKIE_PREFERENCIA, tipo, { ...opciones, maxAge: TREINTA_DIAS });
      } else {
        // Valor inventado: no creamos ninguna cookie.
        throw new ErrorDominio("DATOS_INVALIDOS", "La preferencia indicada no es válida.");
      }
      // Redirigimos sin ?tipo para que se vea el efecto de la preferencia.
      res.redirect(303, "/equipos");
    },
  };
}
