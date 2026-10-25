# FixIt frontend

React 19, TypeScript, and Vite frontend for the FixIt Community System.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The browser needs only the public Supabase URL/publishable key and the FastAPI base URL documented in `.env.example`. Never expose the Supabase secret key or Groq API key through a `VITE_*` variable.

## Verification

```powershell
npm run test
npm run lint
npm run build
```

`npm run test
npm run lint` currently performs the strict TypeScript no-emit check. The production build is generated in `dist`.
