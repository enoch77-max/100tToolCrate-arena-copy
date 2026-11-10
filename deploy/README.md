# Single-VPS Production Deployment

## Architecture decision

Run Nginx, Node.js, and SQLite on the same VPS initially. Only Nginx is public on ports 80/443. Node binds to `127.0.0.1:3000`; SQLite is never a network service. This is simpler and safer for the current traffic than operating separate frontend/backend servers.

- **Nginx:** DNS entry point, HTTPS via Certbot, request proxying.
- **Node (`backend/`):** public HTML/API routes, security policy, validation, counters, health checks.
- **SQLite (`data/`):** durable operational data with WAL and versioned migrations.
- **Backups (`backups/`):** daily online SQLite backups with integrity verification and retention.
- **Static preview (`dist/`):** generated for arena/static hosting; the VPS Node server uses the generated canonical root pages instead.

Phase 2 adds commerce; Phase 3 adds the authenticated owner dashboard. Those are not represented as complete in Phase 1.

## Root folder structure

```text
100toolcrate/
├── backend/                  # Private Node backend; never publicly served
│   ├── migrations/           # Ordered, transactional SQL migrations
│   ├── routes/               # Public site and API routers
│   ├── scripts/              # Backup and database verification commands
│   ├── app.js                # Application factory
│   ├── config.js             # Validated environment configuration
│   ├── db.js                 # SQLite connection, migration and queries
│   ├── html.js               # CSP, HTML/Markdown responses and cache
│   ├── middleware.js         # Security, logging and centralized errors
│   └── server.js             # Production listener and graceful shutdown
├── assets/                   # Public CSS, JavaScript and images
├── api/                      # Public OpenAPI document only
├── blog/                     # Generated public blog pages
├── content/                  # Private Markdown/workflow/sponsor sources
├── data/                     # Writable SQLite state; excluded from Git/public files
├── backups/                  # Writable verified backups; excluded from Git/public files
├── deploy/                   # Nginx/systemd/installer and this runbook
├── scripts/                  # Private build and QA scripts
├── tests/                    # Backend integration/security tests
├── tools/                    # Generated public tool pages
├── workflows/                # Generated public workflow pages
├── dist/                     # Self-contained static-host build output
├── .env.example              # Non-secret configuration template
├── generator.js              # Canonical static site generator
├── package.json / lockfile   # Reproducible Node dependencies
└── server.js                 # Existing npm entry; launches backend/server.js
```

The static server uses an allowlist of public directories and explicit files. It does not expose the repository root. `backend/`, `content/`, `data/`, `backups/`, `scripts/`, `deploy/`, `.env`, `package.json`, and `tools.json` return 404.

## VPS baseline

A starting VM is Ubuntu 24.04 LTS or Debian 12, 2 vCPU, 2–4 GB RAM, and 40 GB SSD. Required packages are Node.js 20+, npm, Nginx, rsync, curl, Certbot, and the matching Nginx Certbot plugin. Enable automatic OS security updates and a firewall allowing only SSH, HTTP, and HTTPS.

Before installation:

1. Point `A`/`AAAA` records for `100toolcrate.com` and `www.100toolcrate.com` at the VPS. Remove an AAAA record if IPv6 is not configured.
2. Confirm `node -v` is 20 or newer and `nginx -v`, `rsync --version`, and `certbot --version` work.
3. Keep a separate release checkout such as `/opt/100toolcrate-release`. Do not run the installer from the live application directory.
4. Restrict SSH to key authentication where possible. Do not put secrets in Git, Nginx configs, or generated HTML.

## Install or update

From the release checkout:

```bash
sudo bash deploy/install.sh
```

Optional overrides are `APP_DIR`, `APP_USER`, `DOMAIN`, and `ENV_FILE`. Defaults are `/var/www/100toolcrate`, `toolcrate`, `100toolcrate.com`, and `/etc/100toolcrate/env`.

The installer:

- requires root, Node 20+, Nginx, rsync, and systemctl;
- creates a nologin `toolcrate` system account;
- synchronizes code while excluding and preserving `.env`, `data/`, and `backups/`;
- runs `npm ci --omit=dev` and `npm run build`;
- creates `/etc/100toolcrate/env` only on first install;
- installs and starts the application and daily backup timer;
- validates Nginx before reload;
- polls `/readyz` and runs an immediate verified backup.

For updates, review the changelog and back up first, then `git pull` in the release checkout and rerun the installer. Configuration in `/etc/100toolcrate/env` is preserved.

## Environment and permissions

Edit `/etc/100toolcrate/env` after first installation and restart the service. `DATABASE_PATH` and `BACKUP_DIR` must remain absolute and inside the writable paths declared in systemd. Production `PUBLIC_ORIGIN` must be HTTPS. `TRUST_PROXY=loopback` is correct for same-host Nginx; do not set it to `true` indiscriminately.

The service runs as an unprivileged user with a read-only application filesystem. Only `data/` and `backups/` are writable. The environment file is root-owned mode 0600; systemd reads it before dropping privileges.

After changing configuration:

```bash
sudo systemctl restart 100toolcrate
curl -fsS http://127.0.0.1:3000/readyz
sudo systemctl status 100toolcrate
sudo journalctl -u 100toolcrate -n 100 --no-pager
```

## HTTPS

The supplied Nginx configuration initially listens on HTTP so Certbot can validate the domain. After the readiness check passes and DNS resolves:

```bash
sudo certbot --nginx -d 100toolcrate.com -d www.100toolcrate.com --redirect
sudo certbot renew --dry-run
```

Certbot installs the HTTPS server and redirect. Renewals run through the OS Certbot timer. Do not copy private certificates into the repository. Once HTTPS is verified, restrict public access to Nginx only; Node remains bound to loopback.

## Verification

```bash
node --test tests/backend.test.js
node scripts/seo-audit.mjs
curl -fsS https://100toolcrate.com/healthz
curl -fsS https://100toolcrate.com/readyz
curl -I https://100toolcrate.com/workflows
```

`healthz` checks only process liveness. `readyz` checks SQLite and required generated files, returning 503 when the application should not receive traffic.

## Backups and restore

The daily timer runs `backend/scripts/backup.js` using SQLite's online backup API. Each backup is mode 0600 and checked with `PRAGMA integrity_check`; files older than `BACKUP_RETENTION_DAYS` are removed. Review logs with:

```bash
sudo systemctl list-timers 100toolcrate-backup.timer
sudo journalctl -u 100toolcrate-backup.service -n 30 --no-pager
```

Same-VPS backups protect against accidental deletion and bad writes, not disk or host loss. Copy backups encrypted to an independent location and periodically test an offsite restore.

To restore on the VPS:

1. Stop `100toolcrate.service` so no process writes the database.
2. Move the current `data/toolcrate.db` and any `-wal`/`-shm` files to a quarantine directory.
3. Copy the chosen backup to `data/toolcrate.db`, make it owned by `toolcrate:toolcrate`, and set mode 0600.
4. Set `DATABASE_PATH` to the restored file and run `node backend/scripts/check-database.js` as the application user.
5. Start the service and verify `/readyz`, important pages, and counters.

Do not restore only a WAL-era live database by copying its main file while Node is running; use the online backup files produced by this project.

## Operations and incident response

- Logs go to journald with request IDs, route paths, statuses, and timings. Tool inputs, query strings, passwords, and environment secrets are not logged.
- Rotate journald through the host's standard journal policy and alert on repeated 5xx responses, readiness failures, backup failures, disk usage, and certificate expiry.
- If compromised, isolate the VM, preserve relevant logs, rotate DNS/CDN/email/payment/owner credentials, restore a known-good release and verified backup, then rotate application secrets. Rebuilding from this repository alone does not rotate credentials.
- Keep dependencies updated deliberately. Review `npm audit` output and test upgrades; do not apply blind force-fixes to a production storefront.
- Before Phase 2, load-test page and API traffic. Before accepting payments, complete webhook, idempotency, refund, reconciliation, and failure-state tests.
