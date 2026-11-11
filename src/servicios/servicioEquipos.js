// Servicio de equipos: consultar el catálogo, ver una ficha, añadir equipos
// y cambiar su estado. Las reglas viven aquí, no en las rutas ni en las vistas.

import { ErrorDominio } from "../errores/ErrorDominio.js";
import { ESTADOS_EQUIPO, TIPOS_EQUIPO } from "../dominio/reglas.js";
import { fechaDeHoy } from "../utilidades/validacion.js";

export function crearServicioEquipos(repoEquipos, repoReservas, hoy = fechaDeHoy) {
  async function buscarOFallar(id) {
    const equipo = await repoEquipos.buscarPorId(id);
    if (!equipo) {
      throw new ErrorDominio("NO_ENCONTRADO", "El equipo solicitado no existe.");
    }
    return equipo;
  }

  return {
    // Filtros opcionales: tipo ("portatil" / "sobremesa") y solo operativos.
    async listar({ tipo = null, soloOperativos = false } = {}) {
      let equipos = await repoEquipos.listar();
      if (tipo !== null) {
        equipos = equipos.filter((e) => e.tipo === tipo);
      }
      if (soloOperativos) {
        equipos = equipos.filter((e) => e.estado === "operativo");
      }
      return equipos.sort((a, b) => a.codigo.localeCompare(b.codigo));
    },

    // Ficha de un equipo y los huecos que tiene ocupados a partir de hoy.
    // No devolvemos QUIÉN lo ha reservado: eso no le importa a un visitante.
    async obtenerFicha(id) {
      const equipo = await buscarOFallar(id);
      const reservas = await repoReservas.listar();
      const ocupados = reservas
        .filter((r) => r.equipoId === id && r.estado === "activa" && r.fecha >= hoy())
        .sort((a, b) => (a.fecha + a.turno).localeCompare(b.fecha + b.turno))
        .map((r) => ({ fecha: r.fecha, turno: r.turno }));
      return { equipo, ocupados };
    },

    async crear({ codigo, nombre, tipo }) {
      if (!TIPOS_EQUIPO.includes(tipo)) {
        throw new ErrorDominio("DATOS_INVALIDOS", "El tipo de equipo no es válido.");
      }
      if (await repoEquipos.buscarPorCodigo(codigo)) {
        throw new ErrorDominio("CODIGO_DUPLICADO", `Ya existe un equipo con el código ${codigo}.`);
      }
      // Un equipo nuevo empieza operativo.
      return repoEquipos.crear({ codigo, nombre, tipo, estado: "operativo" });
    },

    async cambiarEstado(id, estado) {
      if (!ESTADOS_EQUIPO.includes(estado)) {
        throw new ErrorDominio("DATOS_INVALIDOS", "El estado indicado no es válido.");
      }
      const equipo = await buscarOFallar(id);
      equipo.estado = estado;
      await repoEquipos.guardar(equipo);
      return equipo;
    },
  };
}
