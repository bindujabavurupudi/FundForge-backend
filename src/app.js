import cors from "cors";
import express from "express";
import apiRouter from "./routes/apiRouter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin === "*" ? true : env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

