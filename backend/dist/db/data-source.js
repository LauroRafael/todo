import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../shared/env";
import { Task } from "../entities/Task.js";
import { Apontamento } from "../entities/Apontamento.js";
export const AppDataSource = new DataSource({
    type: "mysql",
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [Task, Apontamento],
    synchronize: true,
    logging: false
});
