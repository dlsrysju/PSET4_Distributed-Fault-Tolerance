# Docker Implementation — PSET4_Distributed-Fault-Tolerance

This document describes how the project is containerized, how Docker and Docker Compose are configured, and how to run and test failure scenarios locally.

**Location:** `docker-compose.yml` at repository root, `Dockerfile` in each service folder, `protos/` at repo root, and `scripts/` contains simulation helpers.

---

## 1. High-level architecture

- Each microservice runs in its own container (HTTP + gRPC where applicable):
  - `auth` (auth-controller-node) — HTTP port 3000 inside container, gRPC 50051
  - `course` (course-controller-node) — HTTP 3000, gRPC 50052
  - `grade` (grade-controller-node) — HTTP 3000, gRPC 50053
  - `profile` (profile-controller-node) — HTTP 3000, gRPC 50054
  - `account` (account-controller-node) — HTTP 3000, gRPC 50055
  - `view` (view-node) — HTTP gateway and frontend on port 3000 (exposed)
- Databases:
  - `db` — Postgres primary (container `pset4_db`, mapped host port 5432)
  - `db_replica` — Postgres replica container (for testing failover; not configured as real streaming replica)
- Chaos tooling:
  - `pumba` service is included for network/chaos experiments (requires Docker socket access)

All services are connected via a Compose bridge network `appnet` and discover each other by service name (e.g. `auth:50051` for gRPC).

---

## 2. Build and Compose configuration

- Each service has a `Dockerfile` in its folder. For reliable runtime behavior we use:
  - Build context: repository root (`.`) in `docker-compose.yml` and `dockerfile: <service>/Dockerfile` so Dockerfiles can copy shared project files (notably `protos/`).
  - Dockerfiles copy the service source (e.g., `COPY auth-controller-node/ ./`) and `COPY protos/ /protos/` so the `.proto` files exist inside the image at `/protos`.
  - `apk add --no-cache curl` is installed and Dockerfile healthchecks use `curl -fsS http://localhost:3000/health || exit 1` to avoid failing on images that lack `wget`.
- `docker-compose.yml` exposes the HTTP and gRPC ports as needed and defines environment variables for DB connectivity and replica host.
- `view` service uses `env_file: ./view-node/.env` so you can change controller addresses at runtime without rebuilding the image.

Key compose elements:
- `db` service uses `postgres:15` and mounts `./database` into `/docker-entrypoint-initdb.d/` so `schema.sql` runs on first init.
- `db_replica` is a second Postgres container to let the application simulate switching to a replica. (Note: streaming replication is not configured.)
- `pumba` runs `gaiaadm/pumba` with the Docker socket mounted — useful for network delay/loss and process kill testing (may require running from WSL2 on Windows).

---

## 3. Protos handling

Problems observed earlier were caused by the container not having the `protos/*.proto` files at runtime. To avoid that:
- `Dockerfile`s copy `protos/` into the image at build time: `COPY protos/ /protos/`.
- gRPC client/server files expect protos on disk (e.g. `path.join(__dirname, '..', 'protos', 'auth.proto')`), which resolves to `/protos/auth.proto` inside the container.

If you prefer runtime mounts (so editing `.proto` doesn't require rebuilding), you can replace the COPY with a volume in `docker-compose.yml`:
```yaml
volumes:
  - ./protos:/protos:ro
```
But note: Windows mount issues may require WSL2 for `/var/run/docker.sock` and other mounts to behave predictably.

---

## 4. Environment configuration

- `view` reads environment from `view-node/.env` (via `env_file` in compose). Use that file to point the view gateway to local containers or remote IPs:
  - For local compose usage (recommended):
    ```dotenv
    AUTH_SERVICE_ADDR=auth:50051
    COURSE_SERVICE_ADDR=course:50052
    GRADE_SERVICE_ADDR=grade:50053
    AUTH_HTTP_HEALTH=http://auth:3000/health
    ...
    ```
  - For remote services, set the IPs/ports there (e.g., `AUTH_SERVICE_ADDR=203.0.113.5:50051`).
- Services use env vars for DB (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD). Compose sets these for the services to point to the `db` container by hostname `db`.
- We expose `DB_REPLICA_HOST=db_replica` and `DB_REPLICA_PORT=5432` so service-level failover logic can switch to a replica.

---

## 5. Healthchecks

- Each service Dockerfile defines a `HEALTHCHECK` that uses `curl` against the container's local HTTP health endpoint (e.g., `http://localhost:3000/health`).
- The `view` service performs its own internal HTTP checks against controller endpoints (via `HEALTH_TARGETS` in code). Make sure those addresses are container hostnames (not `localhost`) when running under Compose.

Common health-check problems and fixes:
- Health command uses `wget` but image lacks it -> containers marked `unhealthy`. Fix: switched to `curl` and installed `curl` in the image.
- gRPC client or fetch calls attempt to contact `localhost` inside container -> ECONNREFUSED. Fix: use container hostnames like `auth:50051`.
- If services start before DB is ready, they may mark unhealthy. You can recreate services after DB is up or add a `wait-for-db` script to the Dockerfile entrypoint.

---

## 6. Simulation and chaos testing

Scripts included:
- `scripts/simulate-failure.ps1`: stop/start a service for a duration (PowerShell). Example:
```powershell
.\scripts\simulate-failure.ps1 -service auth -downSeconds 15
```
- `scripts/simulate-network.ps1`: runs `pumba` to add network delay to a container (best run from WSL2). Example:
```powershell
.\scripts\simulate-network.ps1 -container course_service -delayMs 200 -durationSeconds 30
```

Pumba examples (manual):
- Kill container every 30s (host/WSL2):
```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock gaiaadm/pumba:0.7.8 --interval 30s kill re2:^auth_service$
```
- Add latency to `course_service`:
```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock gaiaadm/pumba:0.7.8 netem --interface eth0 delay --time 200 re2:^course_service$
```

Note: On Windows, mounting `/var/run/docker.sock` and running `pumba` usually requires WSL2 environment.

---

## 7. Typical commands — PowerShell (Windows)

Start the whole stack (rebuild images):
```powershell
cd 'C:\Users\kylec\Documents\GitHub\PSET4_Distributed-Fault-Tolerance'
docker compose up --build -d
```
Recreate only one service (apply env file changes):
```powershell
docker compose up -d --no-deps --force-recreate view
```
Check status:
```powershell
docker compose ps
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
Follow logs:
```powershell
docker compose logs -f
# or single service
docker compose logs -f auth
```
Inspect health:
```powershell
docker inspect --format '{{.Name}} => {{.State.Status}} / Health: {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' $(docker compose ps -q)
```
Access view UI: open `http://localhost:3000` in your browser (if view is running and host port 3000 is published).

---

## 8. Troubleshooting checklist

If nodes are reported UNHEALTHY, check in this order:
1. `docker compose ps` — are containers `Up` or `Exited`?
2. `docker compose logs <service>` — look for errors: ENOENT (missing /protos), ECONNREFUSED (wrong address), DB errors (authentication, missing schema), or health check command failures.
3. Inspect container health JSON:
```powershell
docker inspect --format '{{json .State.Health}}' <container>
```
4. Confirm service-to-service connectivity from inside a container:
```powershell
docker compose exec view sh -c 'apk add --no-cache curl >/dev/null 2>&1 || true; curl -sS http://auth:3000/health'
```
5. If DB errors, check `docker logs pset4_db` and restart the DB: `docker compose restart db`.
6. If protos are missing, either rebuild images (protos are copied on build) or mount `./protos:/protos` in compose.

---

## 9. Next improvements (optional)

- Add `wait-for-db.sh` and run it in each Dockerfile entrypoint so services wait for DB readiness before starting.
- Implement real Postgres streaming replication for `db_replica` (if testing data-consistent failover is required).
- Centralize environment variables in a root `.env` and use variable substitution in `docker-compose.yml`.
- Replace shell-healthchecks with a small Node health-check binary to avoid installing extra packages in images.

---

## 10. Files you may want to inspect or edit

- `docker-compose.yml` — main orchestration
- `*/Dockerfile` — per-service Dockerfiles
- `view-node/.env` — runtime controller addresses (local vs remote)
- `protos/*.proto` — protobuf definitions
- `database/schema.sql` — initial DB schema
- `scripts/simulate-failure.ps1` and `scripts/simulate-network.ps1` — simulation helpers

---

If you want, I can:
- Add a `wait-for-db.sh` and wire it into service Dockerfiles and entrypoints.
- Change healthchecks to a Node-based probe instead of `curl`.
- Configure true streaming replication for `db_replica`.

Tell me which improvement to implement next and I will patch files and rebuild the images for you.
