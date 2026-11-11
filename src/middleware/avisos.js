// Mensajes de "un solo uso" (lo que a veces se llama flash).
//
// Después de un POST correcto redirigimos (patrón Post/Redirect/Get). El mensaje
// "Reserva confirmada" no puede ir en res.locals, porque res.locals solo dura
// una petición y la redirección es una petición NUEVA. Por eso se guarda en la
// sesión, y aquí lo sacamos y lo borramos: se ve una vez y desaparece.
// Al borrarlo la sesión cambia, y express-session la guarda sola al terminar la respuesta.

export function consumirAviso(req, res, next) {
  res.locals.aviso = null;
  if (req.session.aviso) {
    res.locals.aviso = req.session.aviso;
    delete req.session.aviso;
  }
  next();
}
