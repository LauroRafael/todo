var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Apontamento } from "./Apontamento";
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDENTE"] = "pendente";
    TaskStatus["EM_EXECUCAO"] = "em_execu\u00E7\u00E3o";
    TaskStatus["CONCLUIDA"] = "conclu\u00EDda";
    TaskStatus["CANCELADA"] = "cancelada";
})(TaskStatus || (TaskStatus = {}));
let Task = class Task {
    id;
    title;
    description;
    status;
    completed;
    deadline;
    estimatedHours;
    executedHours;
    postponedCount;
    apontamentos;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn("uuid"),
    __metadata("design:type", String)
], Task.prototype, "id", void 0);
__decorate([
    Column({ type: "varchar", length: 200 }),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    Column({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], Task.prototype, "description", void 0);
__decorate([
    Column({ type: "enum", enum: TaskStatus, default: TaskStatus.PENDENTE }),
    __metadata("design:type", String)
], Task.prototype, "status", void 0);
__decorate([
    Column({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Task.prototype, "completed", void 0);
__decorate([
    Column({ type: "date", nullable: true }),
    __metadata("design:type", Object)
], Task.prototype, "deadline", void 0);
__decorate([
    Column({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], Task.prototype, "estimatedHours", void 0);
__decorate([
    Column({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], Task.prototype, "executedHours", void 0);
__decorate([
    Column({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], Task.prototype, "postponedCount", void 0);
__decorate([
    OneToMany(() => Apontamento, (a) => a.task, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], Task.prototype, "apontamentos", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Task.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Task.prototype, "updatedAt", void 0);
Task = __decorate([
    Entity({ name: "tasks" })
], Task);
export { Task };
