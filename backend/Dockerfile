# Downloads the Linux PocketBase binary directly — the .exe in this folder is
# Windows-only and cannot run inside a Linux container.
FROM alpine:latest

ARG PB_VERSION=0.36.7

RUN apk add --no-cache unzip wget ca-certificates && \
    wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
         -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip

WORKDIR /pb

# Server-side JS hooks (e.g. the project view counter route). PocketBase loads
# them from ./pb_hooks next to the binary.
COPY pb_hooks /pb/pb_hooks

VOLUME /pb/pb_data

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
