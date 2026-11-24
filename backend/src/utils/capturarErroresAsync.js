// Express 4 no atrapa los errores de las funciones async: si una consulta falla, la promesa
// rechazada no llega al manejador de errores y el proceso se cae. Esto la envía a next().
export function capturarErroresAsync(router) {
  for (const capa of router.stack) {
    if (!capa.route) continue;
    for (const paso of capa.route.stack) {
      const original = paso.handle;
      paso.handle = (req, res, next) => {
        try {
          const resultado = original(req, res, next);
          if (resultado && typeof resultado.catch === 'function') resultado.catch(next);
        } catch (err) {
          next(err);
        }
      };
    }
  }
  return router;
}
