// Pruebas de las rutas con Supertest. No arrancamos ningún servidor: le pasamos
// la app directamente a request(). request.agent() guarda las cookies entre
// peticiones, como haría un navegador, así podemos iniciar sesión y seguir.

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { crearApp } from "../src/app.js";
import { cargarConfig } from "../src/config.js";

const config = cargarConfig({
  NODE_ENV: "test",
  SESSION_SECRET: "secreto-solo-para-las-pruebas-1234567890",
});

let app;

// Antes de cada prueba creamos una app nueva, con los datos iniciales limpios.
// Fijamos "hoy" para que las pruebas no dependan del día en que se ejecuten.
beforeEach(async () => {
  app = await crearApp(config, { hoy: () => "2026-11-10" });
});

async function entrarComo(email, password) {
  const agente = request.agent(app);
  const res = await agente.post("/login").type("form").send({ email, password });
  expect(res.status).toBe(303);
  return agente;
}

// Saca el token CSRF del HTML (está en el formulario de "Cerrar sesión").
async function tokenCsrf(agente) {
  const res = await agente.get("/perfil");
  const encontrado = res.text.match(/name="_csrf" value="([^"]+)"/);
  return encontrado[1];
}

function cookieSesion(res) {
  const cookies = res.headers["set-cookie"] ?? [];
  const sesion = cookies.find((c) => c.startsWith("dwes.sid="));
  return sesion ? sesion.split(";")[0] : undefined;
}

describe("catálogo público", () => {
  it("GET /equipos funciona sin sesión", async () => {
    const res = await request(app).get("/equipos");
    expect(res.status).toBe(200);
    expect(res.text).toContain("PC-001");
  });

  it("filtra por tipo y operativos", async () => {
    const res = await request(app).get("/equipos?tipo=sobremesa&operativos=true");
    expect(res.text).toContain("PC-001");
    expect(res.text).not.toContain("PC-002"); // fuera de servicio
    expect(res.text).not.toContain("PORT-001"); // es portátil
  });

  it("un filtro inventado da 400 y un id inexistente 404", async () => {
    expect((await request(app).get("/equipos?tipo=tablet")).status).toBe(400);
    expect((await request(app).get("/equipos/abc")).status).toBe(400);
    expect((await request(app).get("/equipos/999")).status).toBe(404);
    expect((await request(app).get("/no-existe")).status).toBe(404);
  });

  it("la cookie de preferencia filtra el catálogo, y un valor forjado se ignora", async () => {
    const agente = request.agent(app);
    const res = await agente.post("/preferencias/tipo").type("form").send({ tipo: "portatil" });
    expect(res.status).toBe(303);
    const lista = await agente.get("/equipos");
    expect(lista.text).toContain("PORT-001");
    expect(lista.text).not.toContain("PC-001");

    const forjada = await request(app).get("/equipos").set("Cookie", "tipoPreferido=admin");
    expect(forjada.status).toBe(200);
    expect(forjada.text).toContain("PC-001");

    const mala = await request(app).post("/preferencias/tipo").type("form").send({ tipo: "rojo" });
    expect(mala.status).toBe(400);
    expect(mala.headers["set-cookie"] ?? []).not.toEqual(
      expect.arrayContaining([expect.stringContaining("tipoPreferido")])
    );
  });
});

describe("autenticación", () => {
  it("un anónimo que pide /perfil va al login con 303", async () => {
    const res = await request(app).get("/perfil");
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe("/login");
  });

  it("login correcto lleva al perfil, que no muestra el hash", async () => {
    const agente = await entrarComo("ana@example.com", "Ana12345!");
    const perfil = await agente.get("/perfil");
    expect(perfil.status).toBe(200);
    expect(perfil.text).toContain("Ana García");
    expect(perfil.text).not.toContain("$2b$");
    expect(perfil.text).not.toContain("passwordHash");
  });

  it("correo inexistente y contraseña mala dan la misma respuesta 401", async () => {
    const a = await request(app).post("/login").type("form").send({ email: "nadie@example.com", password: "loquesea1" });
    const b = await request(app).post("/login").type("form").send({ email: "ana@example.com", password: "malamala1" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.text).toContain("Correo o contraseña incorrectos.");
    expect(b.text).toContain("Correo o contraseña incorrectos.");
  });

  it("el login cambia el identificador de sesión", async () => {
    const agente = request.agent(app);
    // El registro deja un aviso en la sesión, así que ya tenemos una cookie antes del login.
    const registro = await agente.post("/registro").type("form")
      .send({ nombre: "Marta", email: "marta@example.com", password: "Marta12345" });
    const antes = cookieSesion(registro);
    const login = await agente.post("/login").type("form").send({ email: "marta@example.com", password: "Marta12345" });
    const despues = cookieSesion(login);
    expect(antes).toBeDefined();
    expect(despues).toBeDefined();
    expect(despues).not.toBe(antes);
  });

  it("el registro ignora rol=admin y rechaza correos repetidos", async () => {
    const r = await request(app).post("/registro").type("form")
      .send({ nombre: "Pirata", email: "pirata@example.com", password: "Pirata1234", rol: "admin" });
    expect(r.status).toBe(303);
    const agente = await entrarComo("pirata@example.com", "Pirata1234");
    expect((await agente.get("/admin/equipos")).status).toBe(403);

    const repetido = await request(app).post("/registro").type("form")
      .send({ nombre: "Ana 2", email: "ANA@example.com", password: "OtraClave123" });
    expect(repetido.status).toBe(409);
  });

  it("datos de registro incorrectos dan 400", async () => {
    const r = await request(app).post("/registro").type("form").send({ nombre: "A", email: "no-es-correo", password: "123" });
    expect(r.status).toBe(400);
  });

  it("el logout exige token CSRF y después la sesión ya no vale", async () => {
    const agente = await entrarComo("ana@example.com", "Ana12345!");
    expect((await agente.post("/logout").type("form").send({})).status).toBe(403);

    const _csrf = await tokenCsrf(agente);
    const salir = await agente.post("/logout").type("form").send({ _csrf });
    expect(salir.status).toBe(303);
    expect((await agente.get("/perfil")).status).toBe(303);
  });

  it("más de 10 intentos de login dan 429", async () => {
    let ultimo;
    for (let i = 0; i < 11; i++) {
      ultimo = await request(app).post("/login").type("form").send({ email: "ana@example.com", password: "mal" + i });
    }
    expect(ultimo.status).toBe(429);
  });
});

describe("permisos", () => {
  it("matriz anónimo / usuario / admin en /admin", async () => {
    expect((await request(app).get("/admin/equipos")).status).toBe(303);
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    expect((await ana.get("/admin/equipos")).status).toBe(403);
    expect((await ana.get("/admin/reservas")).status).toBe(403);
    const admin = await entrarComo("admin@example.com", "Admin1234!");
    expect((await admin.get("/admin/equipos")).status).toBe(200);
    expect((await admin.get("/admin/reservas")).status).toBe(200);
  });

  it("un usuario normal no puede cambiar el estado de un equipo aunque mande el POST", async () => {
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    const _csrf = await tokenCsrf(ana);
    const res = await ana.post("/admin/equipos/1/estado").type("form").send({ _csrf, estado: "fuera_de_servicio" });
    expect(res.status).toBe(403);
  });

  it("el admin añade un equipo y cambia su estado", async () => {
    const admin = await entrarComo("admin@example.com", "Admin1234!");
    const _csrf = await tokenCsrf(admin);
    const alta = await admin.post("/admin/equipos").type("form").send({ _csrf, codigo: "port-003", nombre: "Portátil Dell", tipo: "portatil" });
    expect(alta.status).toBe(303);
    expect((await admin.get("/equipos")).text).toContain("PORT-003");

    const estado = await admin.post("/admin/equipos/3/estado").type("form").send({ _csrf, estado: "operativo" });
    expect(estado.status).toBe(303);
  });
});

describe("reservas", () => {
  it("el formulario solo ofrece los equipos libres de ese hueco", async () => {
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    const res = await ana.get("/reservas/nueva?fecha=2027-01-15&turno=manana");
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('value="1"'); // reservado esa mañana
    expect(res.text).not.toContain('value="3"'); // fuera de servicio
    expect(res.text).toContain('value="2"');
  });

  it("reserva correcta: 303 (PRG) y el aviso se ve solo una vez", async () => {
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    const _csrf = await tokenCsrf(ana);
    const res = await ana.post("/reservas").type("form").send({ _csrf, equipoId: "2", fecha: "2027-01-15", turno: "manana" });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe("/mis-reservas");

    expect((await ana.get("/mis-reservas")).text).toContain("Reserva confirmada");
    expect((await ana.get("/mis-reservas")).text).not.toContain("Reserva confirmada");
  });

  it("errores: sin CSRF 403, hueco ocupado 409, fecha pasada 400, equipo inexistente 404", async () => {
    const luis = await entrarComo("luis@example.com", "Luis12345!");
    const _csrf = await tokenCsrf(luis);

    const sinToken = await luis.post("/reservas").type("form").send({ equipoId: "2", fecha: "2027-02-01", turno: "tarde" });
    expect(sinToken.status).toBe(403);

    const ocupado = await luis.post("/reservas").type("form").send({ _csrf, equipoId: "1", fecha: "2027-01-15", turno: "manana" });
    expect(ocupado.status).toBe(409);
    // El formulario se vuelve a mostrar conservando la fecha.
    expect(ocupado.text).toContain('value="2027-01-15"');

    const pasada = await luis.post("/reservas").type("form").send({ _csrf, equipoId: "2", fecha: "2026-01-01", turno: "manana" });
    expect(pasada.status).toBe(400);

    const noExiste = await luis.post("/reservas").type("form").send({ _csrf, equipoId: "999", fecha: "2027-02-01", turno: "tarde" });
    expect(noExiste.status).toBe(404);
  });

  it("no se puede cancelar la reserva de otro cambiando el id de la URL", async () => {
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    const _csrf = await tokenCsrf(ana);
    // La reserva 2 es de Luis.
    expect((await ana.post("/reservas/2/cancelar").type("form").send({ _csrf })).status).toBe(403);
    // La reserva 4 es de Ana pero ya ha pasado.
    expect((await ana.post("/reservas/4/cancelar").type("form").send({ _csrf })).status).toBe(409);
    // La 1 sí es suya y es futura.
    expect((await ana.post("/reservas/1/cancelar").type("form").send({ _csrf })).status).toBe(303);
    expect((await ana.post("/reservas/999/cancelar").type("form").send({ _csrf })).status).toBe(404);
  });

  it("una reserva cancelada deja el hueco libre para otro usuario", async () => {
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    await ana.post("/reservas/1/cancelar").type("form").send({ _csrf: await tokenCsrf(ana) });

    const luis = await entrarComo("luis@example.com", "Luis12345!");
    const res = await luis.post("/reservas").type("form")
      .send({ _csrf: await tokenCsrf(luis), equipoId: "1", fecha: "2027-01-15", turno: "manana" });
    expect(res.status).toBe(303);
  });

  it("el admin puede cancelar cualquier reserva activa", async () => {
    const admin = await entrarComo("admin@example.com", "Admin1234!");
    const res = await admin.post("/admin/reservas/2/cancelar").type("form").send({ _csrf: await tokenCsrf(admin) });
    expect(res.status).toBe(303);
  });

  it("el usuario de la reserva sale de la sesión, no del formulario", async () => {
    const ana = await entrarComo("ana@example.com", "Ana12345!");
    await ana.post("/reservas").type("form")
      .send({ _csrf: await tokenCsrf(ana), equipoId: "4", fecha: "2027-03-03", turno: "tarde", usuarioId: "3" });
    const luis = await entrarComo("luis@example.com", "Luis12345!");
    expect((await luis.get("/mis-reservas")).text).not.toContain("03/03/2027");
    expect((await ana.get("/mis-reservas")).text).toContain("03/03/2027");
  });
});
