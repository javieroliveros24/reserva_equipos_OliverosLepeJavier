// Datos con los que arranca la aplicación (no hay base de datos, todo vive en memoria).
// Si se reinicia el servidor, todo vuelve a este estado inicial.
//
// Las contraseñas de prueba son:
//   admin@example.com -> Admin1234!
//   ana@example.com   -> Ana12345!
//   luis@example.com  -> Luis12345!
// Solo guardamos el HASH que genera bcrypt, nunca la contraseña en texto.
// Los hashes se calculan al arrancar, así no dejamos hashes "pegados" en el código.

import bcrypt from "bcrypt";

export const COSTE_BCRYPT = 10;

export async function crearDatosIniciales() {
  const equipos = [
    { id: 1, codigo: "PC-001", nombre: "Ordenador aula 1", tipo: "sobremesa", estado: "operativo" },
    { id: 2, codigo: "PORT-001", nombre: "Portátil Lenovo", tipo: "portatil", estado: "operativo" },
    { id: 3, codigo: "PC-002", nombre: "Ordenador aula 2", tipo: "sobremesa", estado: "fuera_de_servicio" },
    { id: 4, codigo: "PORT-002", nombre: "Portátil HP", tipo: "portatil", estado: "operativo" },
  ];

  const reservas = [
    { id: 1, equipoId: 1, usuarioId: 2, fecha: "2027-01-15", turno: "manana", estado: "activa" },
    { id: 2, equipoId: 2, usuarioId: 3, fecha: "2027-01-15", turno: "tarde", estado: "activa" },
    { id: 3, equipoId: 4, usuarioId: 2, fecha: "2027-01-20", turno: "manana", estado: "cancelada" },
    // Esta ya ha pasado: sirve para ver que no se puede cancelar.
    { id: 4, equipoId: 1, usuarioId: 2, fecha: "2026-10-05", turno: "tarde", estado: "activa" },
  ];

  // Calculamos los tres hashes a la vez con Promise.all en lugar de uno detrás de otro.
  const [hashAdmin, hashAna, hashLuis] = await Promise.all([
    bcrypt.hash("Admin1234!", COSTE_BCRYPT),
    bcrypt.hash("Ana12345!", COSTE_BCRYPT),
    bcrypt.hash("Luis12345!", COSTE_BCRYPT),
  ]);

  const usuarios = [
    { id: 1, nombre: "Administrador", email: "admin@example.com", passwordHash: hashAdmin, rol: "admin" },
    { id: 2, nombre: "Ana García", email: "ana@example.com", passwordHash: hashAna, rol: "usuario" },
    { id: 3, nombre: "Luis Pérez", email: "luis@example.com", passwordHash: hashLuis, rol: "usuario" },
  ];

  return { equipos, reservas, usuarios };
}
