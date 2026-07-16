import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    JWT_SECRET: z.string().min(16),

    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),

    FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173")
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === "production" && val.JWT_SECRET === "taskflow-secret-key") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "JWT_SECRET não pode ser o valor default em produção", path: ["JWT_SECRET"] });
    }
  });

export const env = envSchema.parse(process.env);
