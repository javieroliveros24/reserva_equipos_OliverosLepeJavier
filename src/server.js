// Punto de arranque: lee la configuración, crea la app y la pone a escuchar.
// Se ejecuta con "npm start", que carga el archivo .env gracias a la opción
// --env-file-if-exists de Node (no hace falta instalar dotenv).

import { cargarConfig } from "./config.js";
import { crearApp } from "./app.js";

let config;
try {
  config = cargarConfig(process.env);
} catch (error) {
  // Si la configuración está mal, avisamos y no arrancamos.
  console.error(`Error de configuración: ${error.message}`);
  console.error("Revisa tu archivo .env (puedes copiar .env.example).");
  process.exit(1);
}

const app = await crearApp(config);

app.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto} (${config.entorno})`);
});
