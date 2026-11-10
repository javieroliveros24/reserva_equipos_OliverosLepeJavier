// Leemos la configuración de las variables de entorno UNA sola vez, al arrancar.
// Es una función "pura": recibe un objeto (normalmente process.env) y devuelve
// la configuración ya validada. Así la podemos probar sin tocar el entorno real.
//
// Si algo está mal preferimos que la aplicación NO arranque, en vez de arrancar
// con un secreto vacío o en un puerto raro y descubrirlo más tarde.

const ENTORNOS_VALIDOS = ["development", "test", "production"];

function leerBooleano(valor, nombre) {
  // OJO: Boolean("false") es true, porque cualquier texto no vacío es "verdadero".
  // Por eso comparamos el texto a mano.
  if (valor === undefined) return false;
  if (valor === "true") return true;
  if (valor === "false") return false;
  throw new Error(`${nombre} debe ser "true" o "false"`);
}

export function cargarConfig(env) {
  // Puerto: si no viene, 3000. Si viene, solo dígitos y entre 1 y 65535.
  let puerto = 3000;
  if (env.PORT !== undefined) {
    if (!/^\d+$/.test(env.PORT)) throw new Error("PORT debe ser un número entero");
    puerto = Number(env.PORT);
    if (puerto < 1 || puerto > 65535) throw new Error("PORT debe estar entre 1 y 65535");
  }

  const entorno = env.NODE_ENV ?? "development";
  if (!ENTORNOS_VALIDOS.includes(entorno)) {
    throw new Error(`NODE_ENV debe ser uno de: ${ENTORNOS_VALIDOS.join(", ")}`);
  }

  // El secreto firma la cookie de sesión. Nunca lo mostramos en el mensaje de error.
  const sessionSecret = env.SESSION_SECRET;
  if (typeof sessionSecret !== "string" || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET es obligatorio y debe tener al menos 32 caracteres");
  }

  return {
    puerto,
    entorno,
    debug: leerBooleano(env.DEBUG, "DEBUG"),
    trustProxy: leerBooleano(env.TRUST_PROXY, "TRUST_PROXY"),
    sessionSecret,
  };
}
