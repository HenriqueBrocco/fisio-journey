# Fisio Journey

Monorepositório do projeto FisioJourney, contendo:

- **Backend**: FastAPI + PostgreSQL + Alembic + WebSocket + visão computacional
- **Frontend**: Vite + React + TypeScript
- **Banco**: PostgreSQL local via Docker e banco cloud para deploy
- **Deploy**
  - Backend: Render (via Docker)
  - Frontend: Vercel

---

## Para rodar o programa localmente

Crie um arquivo .env na raiz do projeto com base no .env.local.example.

Na raiz do projeto utilize o comando:
```
docker compose up --build
```
Serviços esperados:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health
- DB Health: http://localhost:8000/health/db

## Rodando apenas o frontend local apontando para backend publicado
No arquivo apps/frontend/.env, altere os valores das variaveis para:
```
VITE_API_URL=https://fisio-journey-docker.onrender.com
VITE_WS_URL=wss://fisio-journey-docker.onrender.com
```

Depois execute:
```
cd apps/frontend
npm install
npm run dev
Rodando apenas backend local
```