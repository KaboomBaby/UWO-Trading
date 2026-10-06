# UWO Trading

A marketplace interface for UWO ships, property, equipment, resources, and services.

## Development

```zsh
bun install
bun run dev
```

## Validation

```zsh
bun run lint
bun run test
bun run build
bun run verify:supabase
bun run preview
```

The app uses Supabase when both `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are present, and falls back to the local in-memory
mock repositories when they are absent. Copy `.env.example` to `.env` and
provide the anon/publishable key; never put a service-role key in the app or
repository. Database schema and reference data are versioned under
`supabase/migrations`.

`bun run verify:supabase` creates and reads a temporary listing through the
application repository. It intentionally lacks public delete permission, so
remove the printed test row through your Supabase management tool after
verification.
