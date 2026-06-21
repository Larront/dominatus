# Dominatus

A self-hosted tracker for custom Warhammer 40k narrative campaigns — a top-down orbital map of
contested worlds, battle reports, and shifting control. See [`CONTEXT.md`](CONTEXT.md) for the
domain language and [`PRODUCT.md`](PRODUCT.md) for the product shape.

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

## Workflow

Three kinds of branch:

- **`main`** — reflects the currently deployed app. Protected: changes land only through a pull
  request (no review required — solo project), and CI must pass first.
- **`next`** — the integration branch where in-progress work accumulates.
- **`feature/*`** — an independent feature pass. Branch off `next`, open a PR back into `next`.

```sh
git switch next && git pull
git switch -c feature/my-change       # do the work
gh pr create --base next --fill       # feature → next
```

Merged feature branches are deleted automatically.

### Cutting a release

A release is a promotion of `next` into `main`, followed by a version tag:

```sh
# on next: bump "version" in package.json to X.Y.Z, commit
gh pr create --base main --head next --title "release: vX.Y.Z"   # next → main (CI gates it)
# after merge, tag main (tags aren't blocked by branch protection):
git switch main && git pull
git tag vX.Y.Z && git push origin vX.Y.Z
```

Bumping the version on `next` first keeps it to a single release PR. Pushing the tag triggers [`publish.yml`](.github/workflows/publish.yml), which builds the image to
GHCR (`ghcr.io/larront/dominatus:X.Y.Z`, `:X.Y`, `:latest`) and cuts a GitHub Release with notes
auto-generated from the merged PRs (categorised by label via [`.github/release.yml`](.github/release.yml)).
Then redeploy in Dockge. Pre-release tags (e.g. `vX.Y.Z-rc1`) skip `:latest` and are marked as a pre-release.

## Backups

The SQLite database (WAL mode) is snapshotted with `VACUUM INTO`, which is safe to run
against the live app. Snapshots land on the `/backups` mount (host bind mount
`/data/dominatus/backups`) and are rotated to the newest `BACKUP_KEEP` (default 14). Runs are manual.

```sh
# take a snapshot
docker compose exec app bun scripts/backup.js

# copy snapshots off the host (bind mount; survives `down -v`, but still not offsite)
docker compose cp app:/backups ./backups-export

# restore (DESTRUCTIVE — saves the current db to local.db.pre-restore first)
docker compose exec app bun scripts/restore.js            # lists available snapshots
docker compose stop app
docker compose run --rm app bun scripts/restore.js <snapshot>
docker compose start app
```

Locally: `DATABASE_URL=local.db BACKUP_DIR=./backups bun run db:backup`.

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for logging and the full runbook.
