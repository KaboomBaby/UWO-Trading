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
bun run skills:icons
bun run verify:supabase
bun run preview
```

The app uses Supabase when both `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are present, and falls back to the local in-memory
mock repositories when they are absent. Copy `.env.example` to `.env` and
provide the anon/publishable key; never put a service-role key in the app or
repository. Database schema and reference data are versioned under
`supabase/migrations`.

`bun run skills:icons` attempts to download every unique ship-skill icon from
the harvested source URLs. Skills whose source downloads fail use their
original supplied URL through `src/data/ship-skill-icon-status.json`.

`bun run verify:supabase` creates, reads, updates, re-reads, and deletes a
temporary SHIP listing through the application repository, then checks that
listing counts return to their pre-test state.
