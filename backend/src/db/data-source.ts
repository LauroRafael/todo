import "reflect-metadata";
import { DataSource, EntitySchema } from "typeorm";
import { env } from "../shared/env";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  completed: boolean;
  deadline: Date | null;
  estimatedHours: number;
  executedHours: number;
  postponedCount: number;
  createdAt: Date;
  updatedAt: Date;
  apontamentos?: Apontamento[];
};

export type Apontamento = {
  id: string;
  content: string | null;
  hoursSpent: number;
  workDate: Date | null;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
  task?: Task;
};

export type TaskEvent = {
  id: string;
  taskId: string;
  actor: string;
  type: string;
  payload: string | null;
  createdAt: Date;
};

const TaskSchema = new EntitySchema<Task>({
  name: "Task",
  tableName: "tasks",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    title: { type: "varchar", length: 200 },
    description: { type: "text", nullable: true },
    status: { type: "varchar", length: 20, default: "pendente" },
    completed: { type: "boolean", default: false },
    deadline: { type: "date", nullable: true },
    estimatedHours: { type: "float", default: 0 },
    executedHours: { type: "float", default: 0 },
    postponedCount: { type: "int", default: 0 },
    createdAt: { type: "timestamp", createDate: true },
    updatedAt: { type: "timestamp", updateDate: true }
  },
  relations: {
    apontamentos: {
      type: "one-to-many",
      target: () => "Apontamento",
      inverseSide: "task",
      onDelete: "CASCADE",
      cascade: true
    }
  }
});

const ApontamentoSchema = new EntitySchema<Apontamento>({
  name: "Apontamento",
  tableName: "apontamentos",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    content: { type: "text", nullable: true },
    hoursSpent: { type: "float", default: 0 },
    workDate: { type: "date", nullable: true },
    taskId: { type: "uuid", nullable: false },
    createdAt: { type: "timestamp", createDate: true },
    updatedAt: { type: "timestamp", updateDate: true }
  },
  relations: {
    task: {
      type: "many-to-one",
      target: () => "Task",
      joinColumn: { name: "taskId", referencedColumnName: "id", foreignKeyConstraintName: "fk_apontamento_task" },
      inverseSide: "apontamentos",
      onDelete: "CASCADE"
    }
  }
});

const TaskEventSchema = new EntitySchema<TaskEvent>({
  name: "TaskEvent",
  tableName: "task_events",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    taskId: { type: "uuid", nullable: false },
    actor: { type: "varchar", length: 100, default: "system" },
    type: { type: "varchar", length: 50 },
    payload: { type: "text", nullable: true },
    createdAt: { type: "timestamp", createDate: true }
  }
});

export const AppDataSource = new DataSource({
  type: "mysql",
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [TaskSchema, ApontamentoSchema, TaskEventSchema],
  synchronize: env.NODE_ENV !== "production",
  logging: env.NODE_ENV === "production" ? ["error"] : ["error", "schema"]
});
