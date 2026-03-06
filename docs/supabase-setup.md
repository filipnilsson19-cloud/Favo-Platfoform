# Supabase Setup

Det här projektet är nu förberett för `Prisma + Supabase Postgres`.

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
```

Hämta värdena här:

- `DATABASE_URL`: `Connect -> ORMs -> Prisma`
- `DIRECT_URL`: `Connect -> Direct connection`

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

## Viktigt just nu

Just nu är appen `database-ready` för läsning och seedning.

Det betyder:

- recept kan ligga i Supabase
- startsidan kan läsa recept från Supabase
- editorn sparar fortfarande bara lokalt i klienten tills vi bygger write-flödet mot databasen

Nästa steg efter detta är därför att bygga:

1. `Skapa recept` mot databasen
2. `Uppdatera recept` mot databasen
3. `Ta bort/inaktivera recept` mot databasen
