# Agent Guide

Sublet marketplace for Rutgers New Brunswick. Anyone can sign up, and accounts with a confirmed rutgers.edu email are labeled Rutgers verified on listings and messages.

## Layout

- `frontend/` React and Vite web app
- `backend/` Express API, Supabase in production and local SQLite when Supabase is not configured
- `mobile/` Expo app
- `supabase/migrations/` schema, RLS policies and the Rutgers sign-up gate

## Deploy

- `vercel.json` deploys `frontend` and `backend` as one Vercel project with services
- The backend is public under `/api` and also serves the same routes at the root for local dev and mobile
- Run everything locally the Vercel way with `npx vercel dev -L`

## Checks

- Backend tests run with `cd backend && npm test`
- Frontend checks run with `cd frontend && npm test && npm run lint && npm run build`

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
