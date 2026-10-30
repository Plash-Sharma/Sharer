# DriveLite Architecture Decision Records (ADRs)

## ADR 001: Flat UUID Object Keys for Storage (No Virtual Folders in Bucket)
- **Status:** Accepted
- **Context:** Storing files in S3/MinIO with path hierarchies (e.g., `folderA/folderB/file.png`) makes folder moves and renames expensive and prone to partial failure across two storage backends.
- **Decision:** All file objects in MinIO use flat, unguessable UUIDs (`crypto.randomUUID()`) as object keys. No slashes, user IDs, or names appear in object keys. All hierarchical metadata (names, materialized paths, parent relationships, depth) lives exclusively in PostgreSQL.
- **Consequence:** Renaming or moving folders and files touches zero MinIO objects, remaining purely transactional database operations.

## ADR 002: Dual S3 Client Architecture (Server SDK vs. Browser Presign)
- **Status:** Accepted
- **Context:** In Docker or clustered environments, the Next.js backend accesses MinIO over an internal network (e.g. `http://minio:9000`), but the browser cannot resolve container-internal hostnames when executing pre-signed PUT/GET requests directly.
- **Decision:** Introduce two distinct S3 client configurations: `s3Client` pointing to `S3_ENDPOINT` (for direct server HEAD, DELETE, server PUT) and `s3PresignClient` pointing to `S3_PUBLIC_ENDPOINT` (for issuing pre-signed URLs that the browser can reach directly).
- **Consequence:** Eliminates CORS and host-resolution discrepancies between server-side execution and client-side direct transfers.

## ADR 003: 403 Forbidden with Request Access CTA (vs. Stealth 404)
- **Status:** Accepted
- **Context:** When a user navigates to an existing resource for which they lack VIEW permission, the system can either return a 404 (hiding existence) or a 403 with a Request Access call-to-action.
- **Decision:** Return 403 Forbidden with a minimal payload allowing the user to submit an Access Request, without leaking sensitive node metadata beyond item name/owner.
- **Consequence:** Fosters collaboration and access workflows (F7) while maintaining security boundaries.

## ADR 004: Transactional Outbox for Object Purges (`StorageDeletion`)
- **Status:** Accepted
- **Context:** Distributed transactions between PostgreSQL and S3/MinIO are impossible. Deleting S3 objects synchronously inside database transactions risks timeouts and inconsistencies if network fails.
- **Decision:** Purge operations delete database rows and insert the corresponding `storageKey`s into `StorageDeletion` within the same database transaction. A background outbox worker drains the queue in batches of up to 1000 keys (`DeleteObjects`), retrying transient failures.
- **Consequence:** Zero orphaned objects and atomic UI consistency for end users.

## ADR 005: Prisma 6 Stable ORM Selection
- **Status:** Accepted
- **Context:** Prisma 7 is currently experimental with breaking changes to datasource URLs and client initialization.
- **Decision:** Standardize on Prisma 6 stable (`@prisma/client@^6.4.1`) for robust connection pooling and migration support with PostgreSQL 16.
- **Consequence:** Solid type-safety, migration compatibility, and stability.

## ADR 006: Chainguard Container Images for MinIO and mc
- **Status:** Accepted
- **Context:** MinIO deprecated and removed their free community container tags (`minio/minio:latest`) from Docker Hub and dl.min.io.
- **Decision:** Utilize Chainguard's verified, hardened, drop-in images (`cgr.dev/chainguard/minio:latest` and `cgr.dev/chainguard/minio-client:latest`) which preserve identical S3 API, CLI, and console capabilities.
- **Consequence:** Clean reproducibility and security compliance across local development and CI.

## ADR 007: Docker Named Volumes for Data Persistence
- **Status:** Accepted
- **Context:** Mounting local Windows host directories (`./.data/...`) via Docker/WSL causes `chmod`/`chown` permission failures in PostgreSQL (`initdb`) and MinIO (`nonroot` user) because NTFS does not natively support Linux POSIX permission semantics.
- **Decision:** Configure Docker named volumes (`postgres_data` and `minio_data`) for database and object persistence.
- **Consequence:** Fully persistent storage with native Linux filesystem performance and zero permission/chown conflicts on Windows.

## ADR 008: Host Port 5433 for Container PostgreSQL
- **Status:** Accepted
- **Context:** The host machine has an active Windows-native PostgreSQL service bound to port 5432.
- **Decision:** Map the container's PostgreSQL port 5432 to host port 5433 in `docker-compose.yml` and set `DATABASE_URL` to port 5433.
- **Consequence:** Prevents port conflicts and credential collisions with any pre-existing host database services.

## ADR 009: Sliding Window In-Memory Rate Limiting
- **Status:** Accepted
- **Context:** Protect authentication routes (`login`, `register`) and public share-link token resolution from brute-force token guessing without requiring external Redis in local development.
- **Decision:** Implemented an in-memory sliding window rate limiter with automated periodic cleanup of stale timestamps. Configured for 5 attempts/min on auth and 30 attempts/min on share link resolution.
- **Consequence:** Resilient defense against brute-force attacks with zero external service dependencies.

## ADR 010: Pure-Function Role Resolver
- **Status:** Accepted
- **Context:** Permission evaluation must consider ownership, direct grants, inherited grants, nearest-ancestor overrides, and time-bound share links with potential expiration.
- **Decision:** Implemented `resolveEffectiveRole` as a pure function accepting the node, ancestor IDs, active grants, optional share link, and an injectable `now` date parameter.
- **Consequence:** Trivially testable with fake timers and zero mock database overhead; guarantees mathematically deterministic permission calculations.

## ADR 011: Direct Local PostgreSQL Adaptation
- **Status:** Accepted
- **Context:** Local PostgreSQL 16 was running natively on port 5432 on Windows while Docker service was paused.
- **Decision:** Programmatically provisioned a dedicated `drivelite` database and user role on the local PostgreSQL instance, applied custom partial unique indexes, and pointed `.env` to it.
- **Consequence:** Development and testing proceed without blocking on Docker Desktop daemon initialization.

## ADR 012: In-App Text File Editing with Concurrency Check
- **Status:** Accepted
- **Context:** Editing in-app text and markdown files must avoid last-write-wins data loss and comply with immutable S3 object principles.
- **Decision:** Saving an in-app text file verifies `updatedAt` against the client's version (returning 409 Conflict if changed), uploads a new object to MinIO under a fresh UUID, and enqueues the superseded key into `StorageDeletion` outbox.
- **Consequence:** Concurrency-safe, consistent editing with zero orphan objects in storage.
