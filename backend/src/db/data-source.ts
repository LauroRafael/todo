import "reflect-metadata";
import { DataSource, EntitySchema } from "typeorm";
import { env } from "../shared/env";

const TaskSchema = new EntitySchema({
  name: "Task",
  tableName: "tasks",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    title: { type: "varchar", length: 200 },
    description: { type: "text", nullable: true },
    status: { type: "varchar", default: "pendente" },
    completed: { type: "boolean", default: false },
    deadline: { type: "date", nullable: true },
    estimatedHours: { type: "int", default: 0 },
    executedHours: { type: "int", default: 0 },
    postponedCount: { type: "int", default: 0 },
    createdAt: { type: "timestamp", createDate: true },
    updatedAt: { type: "timestamp", updateDate: true }
  }
});

const ApontamentoSchema = new EntitySchema({
  name: "Apontamento",
  tableName: "apontamentos",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    content: { type: "text", nullable: true },
    hoursSpent: { type: "int", default: 0 },
    workDate: { type: "date", nullable: true },
    taskId: { type: "varchar", length: 36 },
    createdAt: { type: "timestamp", createDate: true },
    updatedAt: { type: "timestamp", updateDate: true }
  }
});

export const AppDataSource = new DataSource({
  type: "mysql",
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [TaskSchema, ApontamentoSchema],
  synchronize: true,
  logging: ["error", "query", "schema"]
});
