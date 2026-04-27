import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.string().default("development"),
    JWT_SECRET: z.string().min(1).default("taskflow-secret-key"),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173")
});
export const env = envSchema.parse(process.env);
