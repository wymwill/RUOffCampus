# Agent Guide

Rutgers-only sublet marketplace. Students with a verified rutgers.edu email browse, save, post and message about sublets near campus.

## Layout

- `frontend/` React and Vite web app
- `backend/` Express API, Supabase in production and local SQLite when Supabase is not configured
- `mobile/` Expo app
- `supabase/migrations/` schema, RLS policies and the Rutgers sign-up gate

## Checks

- Backend tests run with `cd backend && node --test --test-concurrency=1 "tests/*.test.js"`
- Frontend checks run with `cd frontend && npm run lint && npm run build`

## Commits

- Commit and push when a change is complete and the checks pass
- Write each commit message as one brief sentence that states exactly what changed
- Start with a verb such as Add, Fix, Remove or Update
- Do not use emojis, semicolons, colons or dashes in commit messages
- Do not add filler, summaries, bullet lists or AI attribution lines such as Co-Authored-By
- Keep one logical change per commit

Good examples

- Fix mobile unfavorite sending favorite row id instead of listing id
- Add date range filter to listing search

Bad examples

- feat: improve favorites 🚀
- Fix bug; also refactor some code
- Updated things to make it better
