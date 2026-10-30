FROM cgr.dev/chainguard/minio-client:latest AS mc-bin
FROM alpine:latest
COPY --from=mc-bin /usr/bin/mc /usr/bin/mc
RUN apk add --no-cache bash ca-certificates
