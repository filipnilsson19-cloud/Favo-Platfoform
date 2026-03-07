# Supabase Setup

Det här projektet är nu förberett för `Prisma + Supabase Postgres + Supabase Auth`.

## 1. Skapa ett Supabase-projekt

1. Gå till [Supabase](https://supabase.com/)
2. Skapa ett nytt projekt
3. Välj ett projektnamn
4. Sätt ett databasenlösenord och spara det
5. Vänta tills projektet är klart

## 2. Lägg in connection strings lokalt

Skapa filen `.env.local` i projektroten och utgå från `.env.example`.

Filen ska innehålla:

```env
DATABASE_URL="YOUR_SUPABASE_POOLED_DATABASE_URL"
DIRECT_URL="YOUR_SUPABASE_DIRECT_DATABASE_URL"
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
```

Hämta värdena här:

- `DATABASE_URL`: `Connect -> ORMs -> Prisma`
- `DIRECT_URL`: `Connect -> Direct connection`
- `NEXT_PUBLIC_SUPABASE_URL`: `Project Settings -> API`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: `Project Settings -> API`
- `SUPABASE_URL`: samma som projekt-URL ovan
- `SUPABASE_PUBLISHABLE_KEY`: samma som publishable key ovan

## 3. Generera Prisma-klienten

```bash
npm run db:generate
```

## 4. Skapa tabellerna i Supabase

```bash
npm run db:push
```

## 5. Lägg in recepten i databasen

```bash
npm run db:seed
```

## 6. Starta appen

```bash
npm run dev
```

Om databasen är korrekt kopplad kommer startsidan nu att läsa recepten från Supabase i stället för från den lokala fallback-filen.

## 7. Lägg till första testanvändaren

Tills vi bygger en riktig användaradmin gör du så här:

1. Gå till `Authentication -> Users` i Supabase
2. Skapa en användare med e-post och lösenord
3. Logga sedan in i appen med den användaren

Första personen som loggar in får automatiskt rollen `admin`. Nästa användare får `personal`.

## Viktigt just nu

Just nu är appen redo för:

- recept från Supabase
- spara/uppdatera/radera recept mot Supabase
- login via Supabase Auth
- rollerna `admin` och `personal`
