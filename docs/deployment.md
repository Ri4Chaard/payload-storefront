# Deploying Aurum

For whoever runs the VPS. The application is a single container built from this repository; the
database is yours to provide.

## What you are deploying

`docker-compose.yml` defines two profiles and starts nothing without one:

| Profile | Starts | Where it runs |
| --- | --- | --- |
| `local` | Postgres on `127.0.0.1:5432` | A developer's machine, with the app on the host |
| `prod` | The app | The server |

The `prod` profile does **not** bring a database. Point it at one you have provisioned — managed
Postgres, or a Postgres you run separately on the same host.

## Requirements

- Docker Engine with the Compose plugin (v2)
- Postgres 17, reachable from the container, with an empty database and a user that may create
  tables — the app applies its own schema migrations
- A reverse proxy (nginx, Caddy) terminating TLS in front of the app
- ~4 GB free disk for the build; the image builds on the machine it runs on

## Configure

Clone the repository, then create `.env` beside `docker-compose.yml`:

```ini
DATABASE_URI=postgres://user:password@host:5432/aurum
PAYLOAD_SECRET=            # openssl rand -base64 32
NEXT_PUBLIC_SERVER_URL=https://example.com
APP_PORT=3000              # optional; the port published for the reverse proxy
```

`RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are required too (see `.env.example`). The app refuses to
start and names any required variable that is missing.

- `DATABASE_URI` — if Postgres runs on the same host but outside this compose project, use
  `host.docker.internal` as the host; the compose file maps it to the host gateway.
- `PAYLOAD_SECRET` — encrypts stored credentials. Rotating it invalidates existing admin sessions.
  Keep it out of version control.
- `NEXT_PUBLIC_SERVER_URL` — the public origin, no trailing slash. It is compiled into the browser
  bundle, so **changing it requires a rebuild, not a restart**.

## Deploy

```bash
docker compose --profile prod up -d --build
```

The container applies the committed database migrations and then starts the server. A failed
migration stops the deploy — the app does not boot against the wrong schema.

**All-in-one alternative.** `docker-compose.full.yml` brings its own Postgres alongside the app
(not published to the host) and runs the same image, migrations included:

```bash
docker compose -f docker-compose.full.yml up -d --build
```

`.github/workflows/deploy.yml` runs exactly that over SSH. It is manual (`workflow_dispatch`) and
needs the `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_SSH_KEY` secrets plus an optional `DEPLOY_PATH`
variable.

## Content

**Neither path seeds.** A fresh environment comes up with a schema and no shop: no categories, so
every `/rings`-style route is a 404 and the header's four navigation links are dead; no products, so
the listing shows its empty state and the home page drops both bands.

Fill it once, from inside the container, so uploads land in the mounted media volume rather than on
whichever machine ran the command:

```bash
docker compose --profile prod exec -T app pnpm seed
```

It is idempotent, so it is safe to re-run — but it updates products **in place**, which means it
also overwrites anything authored in the admin since the last run. That is why it is not part of the
deploy. Once the owner starts writing real content, stop running it.

Check it came up:

```bash
docker compose --profile prod ps
docker compose --profile prod logs -f app
curl -I http://127.0.0.1:3000
```

The storefront is at `/`, the admin panel at `/admin`. On a brand-new database, the first visit to
`/admin` asks you to create the first administrator; do that before the site is publicly announced.

## Release a new version

```bash
git pull
docker compose --profile prod up -d --build
```

Same command every time. Compose rebuilds the image, applies any new migrations, and replaces the
container.

## Reverse proxy

The app listens on `APP_PORT` (3000 by default) over plain HTTP and expects TLS to be terminated in
front of it. Proxy to `http://127.0.0.1:3000` and forward the usual headers. Two notes:

- Allow request bodies of at least 25 MB — the admin panel uploads images (`client_max_body_size`
  in nginx).
- The port is published on loopback only (`127.0.0.1:${APP_PORT:-3000}`), so the proxy must run on
  the same host.

## State to back up

| What | Where |
| --- | --- |
| Content, users, orders | Your Postgres database |
| Uploaded images | The `aurum_media` Docker volume, mounted at `/app/media` |

Both matter. The database references files by name; a database restored without its media volume
renders broken images.

```bash
# media snapshot
docker run --rm -v aurum_media:/media -v "$PWD:/backup" alpine \
  tar czf /backup/media-$(date +%F).tar.gz -C /media .
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Container exits at startup naming a missing variable | That variable is missing from `.env` |
| Container exits during startup, logs end in a migration error | Migration failed — the schema is untouched, fix the database and redeploy |
| `ECONNREFUSED` on boot | `DATABASE_URI` unreachable from inside the container; `localhost` there means the container, not the host |
| Site loads but links and metadata point at `localhost` | `NEXT_PUBLIC_SERVER_URL` was wrong at build time — fix `.env` and rebuild |
| Build fails writing to disk | The host is out of space; `docker builder prune` reclaims the build cache |

## Not yet in place

No log shipping and no dedicated health endpoint: the image's Docker `HEALTHCHECK` requests `/`.
The only pipeline is the manual `deploy.yml` workflow.
