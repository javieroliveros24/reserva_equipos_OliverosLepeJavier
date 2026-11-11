// En cada petición miramos si la sesión tiene un usuarioId y, si es así,
// buscamos a ese usuario en el repositorio. Esto es importante:
//  - Que la sesión tenga un id no significa que el usuario siga existiendo
//    (podría haberse borrado). Por eso lo buscamos siempre.
//  - El rol lo sacamos del usuario guardado en el servidor, NUNCA de una
//    cookie, de la URL ni del formulario.
//
// Deja el resultado en req.usuario (para controladores y middleware) y en
// res.locals.usuarioActual (para que las vistas pinten el menú).

export function crearCargarUsuario(servicioUsuarios) {
  return async function cargarUsuario(req, res, next) {
    req.usuario = null;

    const id = req.session.usuarioId;
    if (id !== undefined) {
      const usuario = await servicioUsuarios.buscarPublico(id);
      if (usuario) {
        req.usuario = usuario;
      } else {
        // La sesión apunta a un usuario que ya no existe: la dejamos sin identidad.
        delete req.session.usuarioId;
      }
    }

    res.locals.usuarioActual = req.usuario;
    next();
  };
}
