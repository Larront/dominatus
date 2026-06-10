# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.15.4 create --template minimal --types ts --add prettier vitest="usages:unit,component" tailwindcss="plugins:none" drizzle="database:sqlite+sqlite:better-sqlite3" better-auth="demo:none" --install bun dominatus
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Backups

The SQLite database (WAL mode) is snapshotted with `VACUUM INTO`, which is safe to run
against the live app. Snapshots land on the `dominatus-backups` volume (`/backups`) and
are rotated to the newest `BACKUP_KEEP` (default 14). Runs are manual.

```sh
# take a snapshot
docker compose exec app bun scripts/backup.js

# copy snapshots off the host (the volume survives `down` but NOT `down -v`)
docker compose cp app:/backups ./backups-export

# restore (DESTRUCTIVE — saves the current db to local.db.pre-restore first)
docker compose exec app bun scripts/restore.js            # lists available snapshots
docker compose stop app
docker compose run --rm app bun scripts/restore.js <snapshot>
docker compose start app
```

Locally: `DATABASE_URL=local.db BACKUP_DIR=./backups bun run db:backup`.

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for logging and the full runbook.
