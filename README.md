# ScarletSublet

Student-to-student sublet marketplace for Rutgers. Live at https://scarletsublet.vercel.app

Sublet supply at Rutgers is scattered across Facebook groups, GroupMe, and Reddit, with no way to tell if a listing is real. ScarletSublet gates sign-up to Rutgers email addresses (@scarletmail.rutgers.edu and *.rutgers.edu), so every listing comes from a verified Rutgers student.

## Features

- Browse and search listings with filters (~40 ms search responses)
- Interactive map with Rutgers bus routes
- Favorites and account management
- Expo mobile app (Browse, Favorites, Account)
- Importer pulls real listings from Rutgers' official off-campus housing marketplace; 136 active listings as of Oct 2026

## Stack

- Frontend: TypeScript web app on Vercel
- Backend: Express API on Render in front of Supabase Postgres (8 tables)
- Mobile: Expo app

## Local development

Set `LISTINGS_STORAGE=local` to run the backend on bundled sample data. No Supabase keys needed.
