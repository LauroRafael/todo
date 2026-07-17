import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { AppDataSource } from "./db/data-source.js";
import { env } from "./shared/env.js";
import { tasksRouter } from "./routes/tasks.js";
import { authRouter } from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 200,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    db: AppDataSource.isInitialized ? "connected" : "connecting"
  })
);
app.use("/auth", authRouter);
app.use("/tasks", authMiddleware, tasksRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erro interno do servidor" });
});

async function seedDefaultUser() {
  try {
    const repo = AppDataSource.getRepository("User");
    const admin = await repo.findOneBy({ username: "admin" });
    if (!admin) {
      const passwordHash = await bcrypt.hash("tsk123", 10);
      await repo.save({ username: "admin", passwordHash, role: "admin", displayName: "Administrador" });
      console.log("Usuário admin padrão criado (admin / tsk123).");
    } else if (!admin.displayName) {
      await repo.update({ id: admin.id }, { displayName: "Administrador" });
      console.log("displayName do admin atualizado.");
    }
  } catch (err) {
    console.error("[seed] Falha ao criar admin:", err);
  }
}

async function initDbWithRetry() {
  let attempt = 0;
  while (!AppDataSource.isInitialized) {
    attempt += 1;
    try {
      await AppDataSource.initialize();
      console.log("Banco conectado.");
      await seedDefaultUser();
      return;
    } catch (err) {
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
