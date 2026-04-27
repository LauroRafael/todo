import express from "express";
import cors from "cors";
import { AppDataSource } from "./db/data-source.js";
import { env } from "./shared/env.js";
import { tasksRouter } from "./routes/tasks.js";
import { authRouter } from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";
const app = express();
app.use(cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true
}));
app.use(express.json());
app.get("/health", (_req, res) => res.json({
    ok: true,
    db: AppDataSource.isInitialized ? "connected" : "connecting"
}));
app.use("/auth", authRouter);
app.use("/tasks", authMiddleware, tasksRouter);
async function initDbWithRetry() {
    let attempt = 0;
    while (!AppDataSource.isInitialized) {
        attempt += 1;
        try {
            await AppDataSource.initialize();
            console.log("Banco conectado.");
            return;
        }
        catch (err) {
            const waitMs = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
            console.error(`Falha ao conectar no banco (tentativa ${attempt}). Nova tentativa em ${waitMs}ms.`);
            console.error(err);
            await new Promise((r) => setTimeout(r, waitMs));
        }
    }
}
app.listen(env.PORT, () => {
    console.log(`API rodando em http://localhost:${env.PORT}`);
});
void initDbWithRetry();
