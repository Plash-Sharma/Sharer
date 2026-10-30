# DriveLite Architecture

## 1. High-Level Architecture

```mermaid
flowchart LR
  subgraph Client["Browser (React / Next.js client components)"]
    UI[Explorer UI]
    Q[TanStack Query cache]
  end

  subgraph Next["Next.js Server"]
    MW[middleware.ts: auth gate + security headers]
    RH[Route Handlers /api/* — uploads, downloads, share-link resolve]
    SA[Server Actions — create folder, rename, share, request access]
    SVC[Service layer]
    PERM[Permission Engine]
    REPO[Repository layer]
  end

  subgraph Infra
    PG[(PostgreSQL)]
    ST[(MinIO S3 bucket — flat UUID keys)]
    RL[(Rate limiter)]
  end

  UI --> Q --> RH
  UI --> SA
  MW --> RH
  MW --> SA
  RH --> SVC
  SA --> SVC
  SVC --> PERM
  SVC --> REPO --> PG
  SVC -->|presign, HEAD, DELETE| ST
  UI -. "presigned PUT / GET (bytes)" .-> ST
  MW --> RL
```

## 2. Core Principles
1. **Composite Node Pattern:** One table (`Node`) models both files and folders. Permissions, share links, and access requests all reference `Node`.
2. **Flat Object Storage:** All file bytes reside in MinIO under flat UUID keys (`crypto.randomUUID()`). Folder hierarchies exist only in PostgreSQL.
3. **Zero-Byte-Proxy:** Next.js never streams or proxies file bytes. Uploads and downloads execute directly between the browser and MinIO via signed URLs.
4. **Centralized Authorization:** Authorization is evaluated solely on the server via `PermissionEngine` (`src/server/permissions`), with the rule `VIEWER < EDITOR < OWNER`.
