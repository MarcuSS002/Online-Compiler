# Online Compiler

Write code in the browser, run it, see the output. Supports Python, C++, and JavaScript.

Built with React + Express + PostgreSQL + Redis. The frontend talks to a REST API, which queues submissions via Redis. A separate worker process picks them up, executes the code in a sandboxed child process, and writes results back to Postgres.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, TailwindCSS, shadcn/ui |
| Backend | Express, TypeScript, Prisma, PostgreSQL, Redis |
| Worker | Node.js, TypeScript, Prisma, Redis |

---

## Project Structure

```
/
├── frontend/   # React app
├── backend/    # REST API + Redis queue producer
└── worker/     # Code execution worker (Redis consumer)
```

---

## Getting Started

You'll need Node.js 18+, a running PostgreSQL instance, and Redis.

```bash
# Install dependencies in all three packages
cd backend && npm install
cd ../frontend && npm install
cd ../worker && npm install
```

Create `.env` files in `backend/` and `worker/` with your database URL and Redis connection details. Check the respective `prisma/schema.prisma` for the expected `DATABASE_URL` format.

Run database migrations:

```bash
cd backend
npx prisma migrate dev
```

---

## Running Locally

You need three terminals.

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd worker && npm run dev
```

Frontend runs on `http://localhost:5173` by default. Backend on port `3000`.

---

## How It Works

1. User writes code in the browser and hits Run
2. Frontend `POST /submission` → backend creates a DB record with status `Processing` and pushes the job to a Redis list
3. Worker polls Redis, pulls the job, spawns a child process to execute the code (with a 5s timeout and sandboxed env)
4. Worker updates the submission record with `Success`, `Failure`, or `TLE` + the output
5. Frontend polls `GET /submission/:id` until status is no longer `Processing`

---

## API

```
POST /submission        Submit code for execution
GET  /submission/:id    Poll submission status and output
```

Request body for `POST /submission`:

```json
{
  "code": "print('hello')",
  "language": "python"
}
```

Supported language values: `python`, `cpp`, `javascript`

---

## Database Schema

```prisma
model Submissions {
  id       String           @id @default(uuid())
  code     String
  language String
  status   SubmissionStatus
  output   String?
}

enum SubmissionStatus {
  Processing
  Success
  Failure
  TLE
}
```

---

## Production Build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build        # serve dist/ with nginx or similar
cd worker && npm run build && npm start
```

---

## Known Limitations

- No auth — anyone with the URL can submit code
- Submissions share a single `code/` directory in the worker; concurrent jobs overwrite each other's files
- No resource limits beyond the 5s timeout (no memory cap, no network isolation)
- Not safe to expose publicly without Docker/VM sandboxing per submission

---

## License

ISC