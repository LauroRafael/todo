# Todo (React + Node + TypeORM + MySQL + Tailwind)

## Requisitos
- Node.js 18+
- Docker (para o MySQL)

## Subir a aplicação (dev)
Na pasta `todo/`:

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/health`

## Variáveis de ambiente
Os padrões do backend já batem com o `docker-compose.yml`. Se quiser ajustar:

- `backend/.env` (veja `backend/.env.example`)

O MySQL do projeto sobe em `127.0.0.1:3305` (para evitar conflito com um MySQL local na porta 3306).

