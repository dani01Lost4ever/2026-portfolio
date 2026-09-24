# Downloads the Linux PocketBase binary directly — the .exe in this folder is
# Windows-only and cannot run inside a Linux container.
FROM alpine:latest

ARG PB_VERSION=0.36.7
# Set automatically by BuildKit (amd64, arm64, …) so the right binary is fetched
ARG TARGETARCH=amd64

RUN apk add --no-cache unzip wget ca-certificates && \
    wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
         -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip

WORKDIR /pb

# Schema migrations ship with the image; PocketBase applies any new ones on
# start and records them in pb_data, so already-applied files are skipped.
COPY pb_migrations /pb/pb_migrations

VOLUME /pb/pb_data

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
