# System Architecture

This repository contains a fault-tolerant online enrollment system where each major concern runs on its own node/process. The layout mirrors the assignment requirement that when one node is down, only its features fail while the rest continue to operate.

## Node Responsibilities

| Node / Port | Path | Purpose | Key Dependencies |
|-------------|------|---------|------------------|
| View Node (3000) | `view-node/` | Static MVC front-end served by Express. Handles authentication UI, course browsing, enrollment actions, and grade management through REST calls. | Browser fetches services via `public/js/*.js`. |
| Auth Controller (4001) | `auth-controller-node/` | Owns login, registration, token verification, and JWT issuance. Persists users via PostgreSQL. | `controllers/authController.js`, `models/userModel.js`, bcrypt, jsonwebtoken. |
| Course Controller (4002) | `course-controller-node/` | Provides course catalog APIs and enrollment workflows. Uses auth middleware to validate JWT with the Auth service. | `controllers/courseController.js`, `controllers/enrollmentController.js`, corresponding models. |
| Grade Controller (4003) | `grade-controller-node/` | Lets students read grades and faculty upload/update grades (single or batch). Reuses auth middleware pattern. | `controllers/gradeController.js`, `models/gradeModel.js`. |
| Primary / Replica Databases | `database/schema.sql` | PostgreSQL instances holding users, courses, enrollments, and grades. Every model tries the primary connection first, then falls back to the replica. | `pg` pools instantiated in each model. |

Each controller node is a standalone Express app with its own middleware stack, routes, health check, and logging. They communicate only over HTTP, so they can run on separate machines or virtualized nodes.

## Request Lifecycles

1. **Authentication**
   1. View node posts to `http://<auth-node>/api/auth/login`.
   2. Auth Controller validates credentials against PostgreSQL, issues a JWT (`24h` expiry).
   3. Token is stored client-side and reused until logout or expiry.
2. **Protected Requests (courses, enrollments, grades)**
   1. View node includes `Authorization: Bearer <JWT>` header.
   2. Course/Grade nodes run `middleware/authMiddleware.js`, which calls `POST /api/auth/verify` on the Auth node.
   3. If verification passes, `req.user` is populated with claims (userId, role, etc.) and the controller continues.
3. **Enrollments**
   - `POST /api/enrollments` checks role=student, course status, capacity, and duplicates before inserting enrollment.
4. **Grade Upload**
   - Faculty-only endpoint `POST /api/grades/upload` (or `/batch-upload`) validates ownership of enrollments before upserting records.

Because each controller keeps its own business rules and data-access layer, a failure in one service does not cascade except for the features it owns.

## Fault Tolerance Strategy

- **Horizontal Service Isolation** – View, Auth, Course, and Grade components are separate processes. Stopping one controller only breaks its own REST endpoints.
- **Stateless Authentication** – JWTs eliminate shared session storage, allowing any controller node to validate tokens via the Auth service.
- **Database Redundancy Hooks** – Every model instantiates both a primary and replica `pg` pool. If `SELECT 1` on the primary fails, reads (and even writes, with logging) fall back to the replica, meeting the “redundant persistence layer” bonus requirement once an actual replica is provisioned.
- **Health Checks** – Each controller exposes `/health`. Course and Grade nodes report the status of their dependencies (DB + Auth). The view periodically polls service health (`public/js/app.js`) to notify users when a node is unavailable.
- **Graceful Degradation** – Front-end sections (`loadCourses`, `loadGrades`, etc.) show warning banners when a controller is unreachable, allowing other tabs to keep working.

## Data Storage

The schema at `database/schema.sql` defines:

- `users` (students and faculty, bcrypt-hashed passwords)
- `courses` (status, capacity, faculty assignment)
- `enrollments` (unique student-course pairs)
- `grades` (one per enrollment, owned by faculty)

Seed data is included for rapid testing. Indexes exist on columns frequently queried by the controllers.

## Deployment Topology

```
Browser (localhost:3000)
   |
   v
View Node ────────────────┬───────────────┬───────────────┐
 auth APIs (4001)         |               |               |
                          v               v               v
                 Auth Controller   Course Controller   Grade Controller
                          \           |       /           |
                           \          |      /            |
                            └────── PostgreSQL Primary ───┘
                                       |
                                       └── PostgreSQL Replica (failover)
```

- Each node can run on a different VM / container. Update the `CONTROLLERS` map in `view-node/public/js/app.js` and the `AUTH_SERVICE_URL` / DB environment variables per deployment.
- Start commands:
  - `cd view-node && npm start`
  - `cd auth-controller-node && npm start`
  - `cd course-controller-node && npm start`
  - `cd grade-controller-node && npm start`
- Provision two PostgreSQL instances (primary + replica). Point `DB_HOST` / `DB_REPLICA_HOST` and respective ports accordingly on every controller node.

## Observability & Ops

- Console logging is built into each server (`server.js`) for basic tracing.
- Health endpoints can be wired to an external monitor or load balancer probe.
- Because nodes are stateless, you can add load balancers or auto-scaling groups per service without code changes.

## Remaining Gaps / Next Steps

The repository satisfies the assignment’s functional requirements, but these items remain to “make this possible” in a production-like distributed setting:

1. **Real Replica Setup** – The code can talk to a replica, but you still need to provision and replicate a secondary PostgreSQL instance (or use a read-only follower) and confirm failover procedures.
2. **Deployment Automation** – Provide scripts or containerization (Docker Compose, Kubernetes manifests, or VM provisioning steps) so each node can be launched consistently on separate machines.
3. **Service Discovery / Config** – Currently, URLs and ports are hard-coded. Externalize them via environment-based config or a registry so nodes can relocate without rebuilding the front-end.
4. **End-to-End Testing & Demo** – Prepare the required video demo, slide deck (key implementation + fault-tolerance explanation), and scripted failover tests that show continued operation when a node is down.
5. **Additional Hardening** – Add request-level retries/backoff on the front-end, structured logging, metrics, and secrets management (the default JWT secret in code is placeholder).

Documenting and implementing the steps above are the recommended “what to do next” actions before submission.

