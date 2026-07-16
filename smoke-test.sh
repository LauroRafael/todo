#!/usr/bin/env bash
# Smoke test cross-platform via curl. Roda contra localhost:4000 por padrão.
set -euo pipefail

API="${API_URL:-http://localhost:4000}"
USER="${TODO_USER:-admin}"
PASS="${TODO_PASS:-tsk123}"

echo "[1/6] Health check"
curl -sS "$API/health" | head -c 200; echo

echo "[2/6] Login"
TOKEN=$(curl -sS -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" | sed -nE 's/.*"token":"([^"]+)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "Falha no login"; exit 1
fi
echo "Token obtido: ${TOKEN:0:20}..."

H_AUTH="Authorization: Bearer $TOKEN"
echo
echo "[3/6] Criar task"
TASK_ID=$(curl -sS -X POST "$API/tasks" \
  -H "$H_AUTH" -H "Content-Type: application/json" \
  -d '{"title":"smoke-test","description":"via script","estimatedHours":4}' | sed -nE 's/.*"id":"([^"]+)".*/\1/p')
echo "Task: $TASK_ID"

echo
echo "[4/6] Listar tasks"
curl -sS "$API/tasks" -H "$H_AUTH" | head -c 400; echo

echo
echo "[5/6] Criar apontamento na task"
curl -sS -X POST "$API/tasks/apontamentos" \
  -H "$H_AUTH" -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK_ID\",\"content\":\"trabalhei 2h\",\"hoursSpent\":2,\"workDate\":\"2026-07-16\"}" | head -c 300; echo

echo
echo "[6/6] Concluir task (status + completed sincronizados)"
curl -sS -X PUT "$API/tasks/$TASK_ID" \
  -H "$H_AUTH" -H "Content-Type: application/json" \
  -d '{"status":"concluída","completed":true}' | head -c 400; echo

echo
echo "OK. Para limpar remova a task criada manualmente se necessário."
