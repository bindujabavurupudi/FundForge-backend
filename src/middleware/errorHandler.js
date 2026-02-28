export const notFoundHandler = (req, res) => {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, _req, res, _next) => {
  const status = Number(err.statusCode ?? 500);
  const message = err.message ?? "Unexpected server error.";
  res.status(status).json({ ok: false, error: message });
};

