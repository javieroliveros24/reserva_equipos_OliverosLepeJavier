#https://gemini.google.com/app/93c12581cbb59759?utm_source=app_launcher&utm_medium=owned&utm_campaign=base_all
# Sistema de reserva de equipos informáticos

Práctica de las unidades 2 y 3 de **Desarrollo Web en Entorno Servidor**.
Aplicación web hecha con **Node.js, Express 5, EJS y JavaScript (ESM)**, con una parte en **TypeScript**.

Los usuarios consultan los equipos del centro, los reservan para una fecha y un turno, ven sus reservas y las cancelan.
Los administradores gestionan los equipos y pueden ver o cancelar cualquier reserva.

---

## 1. Puesta en marcha

Necesitas Node.js 22.9 o superior (en clase usamos el 24).

```bash
npm install
cp .env.example .env      # y cambia SESSION_SECRET por uno tuyo de 32 caracteres o más
npm start                 # abre http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el servidor cargando el `.env` |
| `npm run dev` | Igual, pero se reinicia solo al guardar cambios |
| `npm test` | Ejecuta las pruebas (Vitest + Supertest) |
| `npm run ts:build` | Compila la parte TypeScript (`ts/src-ts` → `ts/dist`) |
| `npm run ts:demo` | Compila y ejecuta la demostración de TypeScript |

El `.env` se carga con la opción `--env-file-if-exists` de Node, así que no hace falta instalar `dotenv`.
Si cambias el `.env` con el servidor ya arrancado, hay que reiniciarlo para que lea los cambios.

### Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| admin@example.com | `Admin1234!` | admin |
| ana@example.com | `Ana12345!` | usuario |
| luis@example.com | `Luis12345!` | usuario |

Las contraseñas solo se guardan como hash de bcrypt. Los hashes se calculan al arrancar (`src/datos/semilla.js`).
Todo está en memoria: al reiniciar el servidor se vuelve a los datos iniciales y se pierden las sesiones.

---

## 2. Estructura del proyecto

```
reserva-equipos/
├── src/
│   ├── app.js                  ← monta la app (sin listen): repos, servicios, middleware, rutas
│   ├── server.js               ← lee la configuración y hace app.listen
│   ├── config.js               ← valida PORT, NODE_ENV, SESSION_SECRET, DEBUG, TRUST_PROXY
│   ├── datos/semilla.js        ← equipos, reservas y usuarios iniciales
│   ├── dominio/reglas.js       ← obtenerEquiposDisponibles, estaReservado, validarReserva...
│   ├── errores/                ← ErrorDominio y la tabla código → estado HTTP
│   ├── utilidades/validacion.js← enteroPositivo, fechas, normalizar registro/login
│   ├── repositorios/           ← acceso a las colecciones (Map en memoria)
│   ├── servicios/              ← reglas de negocio (sin req, res ni EJS)
│   ├── controladores/          ← leen la petición, validan, llaman al servicio y responden
│   ├── rutas/                  ← método + URL + middleware + controlador
│   ├── middleware/             ← sesión, cargarUsuario, autorización, CSRF, avisos, límite, errores
│   └── vistas/                 ← helpers de presentación y modelo de vista del formulario
├── views/                      ← plantillas EJS (parciales, equipos, auth, reservas, admin)
├── public/estilos.css
├── tests/                      ← reglas.test.js (lógica) y rutas.test.js (HTTP)
└── ts/                         ← núcleo de reservas en TypeScript (módulo independiente)
```

### Cómo viaja una petición (ejemplo: `POST /reservas`)

1. **Ruta** (`rutasReservas.js`): `exigirLogin` → `verificarCsrf` → controlador.
2. **Controlador** (`reservasControlador.js`): coge `equipoId`, `fecha` y `turno` del cuerpo, los valida con `validarReserva` y convierte el id a número. El usuario lo saca de `req.usuario` (sesión), **nunca** del formulario.
3. **Servicio** (`servicioReservas.js`): comprueba que el equipo existe, que está operativo y que no hay otra reserva activa en ese hueco. Si algo falla lanza un `ErrorDominio`.
4. **Repositorio** (`repositorioReservas.js`): guarda la reserva en el `Map`.
5. Si todo va bien: aviso en la sesión, `session.save()` y **303** a `/mis-reservas` (patrón PRG). Si falla: se vuelve a pintar el formulario con los datos válidos, los errores y el código HTTP adecuado.

---

## 3. Rutas

| Método | URL | Acceso |
|---|---|---|
| GET | `/equipos`, `/equipos?tipo=portatil&operativos=true`, `/equipos/:id` | Público |
| POST | `/preferencias/tipo` | Público (cookie de preferencias) |
| GET / POST | `/registro`, `/login` | Público |
| POST | `/logout` | Con sesión + CSRF |
| GET | `/perfil`, `/mis-reservas`, `/reservas/nueva` | Con sesión |
| POST | `/reservas`, `/reservas/:id/cancelar` | Con sesión + CSRF |
| GET | `/admin/equipos`, `/admin/reservas` | Rol admin |
| POST | `/admin/equipos`, `/admin/equipos/:id/estado`, `/admin/reservas/:id/cancelar` | Rol admin + CSRF |

### Matriz de resultados esperados

| Petición | Anónimo | Usuario | Admin |
|---|---|---|---|
| GET /equipos | 200 | 200 | 200 |
| GET /perfil | 303 → /login | 200 | 200 |
| GET /reservas/nueva | 303 → /login | 200 | 200 |
| POST /reservas correcta | 303 → /login | 303 → /mis-reservas | 303 → /mis-reservas |
| POST /reservas sin token CSRF | 303 → /login | 403 | 403 |
| GET /admin/equipos | 303 → /login | **403** | 200 |
| POST /admin/equipos/1/estado | 303 → /login | **403** | 303 |
| Cancelar reserva de otro | 303 → /login | **403** | 303 |
| Cualquier URL inexistente | 404 | 404 | 404 |

### Códigos HTTP

| Situación | Código | Código de dominio |
|---|---|---|
| Operación correcta | 200 / 303 | — |
| Datos incorrectos (formulario o URL) | 400 | `DATOS_INVALIDOS` |
| Login incorrecto | 401 | `CREDENCIALES_INVALIDAS` |
| Sin permisos o token CSRF incorrecto | 403 | `SIN_PERMISO`, `CSRF_INVALIDO` |
| No existe | 404 | `NO_ENCONTRADO` |
| Equipo ya reservado para ese turno | 409 | `EQUIPO_RESERVADO` |
| Otros conflictos (fuera de servicio, correo o código repetido, reserva ya cancelada o pasada) | 409 | `EQUIPO_NO_OPERATIVO`, `EMAIL_DUPLICADO`... |
| Demasiados intentos de login | 429 | — |
| Error inesperado | 500 (mensaje genérico) | — |

---

## 4. Seguridad: dónde está cada cosa

| Requisito | Dónde |
|---|---|
| Middleware de autenticación | `exigirLogin` en `middleware/autorizacion.js` |
| Middleware de roles | `exigirRol("admin")`, aplicado a todo el router `/admin` |
| Propiedad de las reservas | `servicioReservas.cancelar()` compara `reserva.usuarioId` con el id de la sesión |
| CSRF (también en el logout) | `middleware/csrf.js`: token con `crypto.randomBytes`, comparación con `timingSafeEqual` |
| Límite de intentos | `middleware/limiteLogin.js`: 10 intentos / 15 min, solo en `POST /login` |
| Validación de datos | `utilidades/validacion.js`, `dominio/reglas.js` y los controladores |
| Errores centralizados | `middleware/errores.js` (404 + manejador de 4 parámetros, sin trazas) |
| Contraseñas | bcrypt (coste 10). Nunca salen a la vista (`aUsuarioPublico` quita el hash) |
| Registro siempre como usuario | El servicio pone `rol: "usuario"`; el campo `rol` del formulario ni se lee |
| Login que no revela si el correo existe | Mismo mensaje y mismo 401; además se compara con un hash de relleno para tardar lo mismo |
| Fijación de sesión | `iniciarSesion()` hace `regenerate` y guarda **solo** `usuarioId` |
| Logout | `session.destroy()` y después `clearCookie("dwes.sid")` con las mismas opciones |
| Escape de HTML | Siempre la etiqueta EJS con `=` para los datos; la de `-` solo para `include` |

### Cookies y sesión

- **Cookie de sesión `dwes.sid`**: `httpOnly`, `sameSite: "lax"`, `secure` solo en producción, `maxAge` de 30 minutos y `rolling: true` (caduca tras 30 minutos sin actividad). El secreto sale de `SESSION_SECRET`. La cookie solo lleva un identificador firmado; los datos se quedan en el servidor.
- **Cookie de preferencias `tipoPreferido`**: guarda `portatil` o `sobremesa` durante 30 días y sirve de filtro inicial del catálogo. Como la puede cambiar cualquiera, se valida al leerla (un valor raro como `admin` se ignora) y **nunca** se usa para decidir permisos.
- **En la sesión** guardamos: `usuarioId`, el token CSRF y el aviso de un solo uso. El rol **no** se guarda: se consulta en el repositorio en cada petición (`cargarUsuario`), así que si se borra un usuario o se le cambia el rol, se nota enseguida.
- En producción, detrás de un proxy (Nginx, Render...), hay que poner `TRUST_PROXY=true` para que `secure` funcione. Sin proxy se deja en `false`.

### Reservas a la vez

Entre "compruebo que el hueco está libre" y "guardo la reserva" hay varios `await`. Que haya `await` **no** evita que otra petición se cuele en medio: si dos personas reservan a la vez, las dos podrían ver el hueco libre. Para evitarlo, el servicio pone en fila las operaciones que cambian reservas (`enFila`), y hay una prueba que lo comprueba. Con una base de datos real se haría con una restricción única o una transacción.

---

## 5. Interfaz

- **Parciales**: `cabecera`, `pie`, `avisos`, `errores` y `estadoEquipo`.
- **Modelo de vista**: `src/vistas/formularioReserva.js` (`crearVMReserva`) prepara las opciones de los `select`, qué opción va marcada, si se puede enviar y los errores.
- **Formulario que depende de los equipos disponibles**: en `/reservas/nueva` primero se eligen fecha y turno con un GET, y el segundo formulario solo ofrece los equipos libres para ese hueco. No hace falta JavaScript en el navegador.
- **Si algo falla** se conservan los campos válidos y se ven los errores. **Si va bien**, aparece un aviso que se ve una sola vez.

---

## 6. JavaScript y TypeScript

Funciones pedidas (en `src/dominio/reglas.js`, sin `req` ni `res`):

- `obtenerEquiposDisponibles(equipos, reservas, fecha, turno)`: usa `filter`
- `estaReservado(equipoId, fecha, turno, reservas)`: usa `some`
- `validarReserva(datos, hoy)`: `hoy` es un parámetro extra para poder fijar la fecha en las pruebas

`find` y `map` se usan en los servicios y repositorios, los bucles `for...of` en los repositorios, y las conversiones en `enteroPositivo`. Todo el acceso a datos es asíncrono.

**TypeScript** (`ts/src-ts`), con `strict: true`, `noEmitOnError` y sin `any` ni `as`:

- `modelos.ts`: interfaces `Equipo`, `Reserva`, `Usuario` y los tipos unión `Rol`, `Turno`, `EstadoReserva`, `EstadoEquipo`
- `repositorios.ts`: la interfaz `RepositorioReservas` y la clase `RepositorioReservasMemoria` con `Map`
- `servicioReservas.ts`: `ServicioReservas`, que recibe los repositorios por el constructor (inyección de dependencias)
- `reglas.ts`: las funciones tipadas y la validación de `unknown` con guardas de tipo
- `demo.ts`: comprueba conflicto, cancelación ajena (`SIN_PERMISO`), cancelación propia y nueva reserva

Los tipos solo existen al programar: al compilar desaparecen. Por eso los datos que llegan del navegador hay que validarlos igualmente.

---

## 7. Pruebas

`npm test` ejecuta:

- `tests/reglas.test.js`: las funciones puras, el servicio (incluidas dos reservas simultáneas) y las copias del repositorio
- `tests/rutas.test.js`: con `request.agent` para conservar las cookies. Prueba el catálogo público, los filtros, la cookie forjada, el login correcto e incorrecto (mismo 401), el cambio de id de sesión al hacer login, la escalada de rol en el registro, el logout con CSRF, el 429, la matriz de permisos, PRG con aviso de un solo uso, 400/403/404/409 al reservar, cancelar reservas ajenas y que el hash nunca aparece en el HTML

Cada prueba crea una app nueva con los datos iniciales y una fecha de "hoy" fija (`2026-11-10`), así no fallan cuando pasen las fechas de los datos de ejemplo.
