#!/bin/sh
# Updates a production deployment: pulls the latest code and builds the images while the old containers keep
# running, then stops them and starts the new ones, so the downtime is only the restart (builds are slow).
# Usage, from anywhere: ./scripts/update.sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
    echo "Missing .env.production (copy .env.production.example and fill it in)" >&2
    exit 1
fi

compose() {
    docker compose -f docker-compose.prod.yml --env-file .env.production "$@"
}

for name in DOWNLOADS_PATH JD_CONFIG_PATH; do
    folder=$(sed -n "s/^$name=//p" .env.production)
    if [ ! -d "$folder" ]; then
        echo "$name ($folder) is not a folder: is the drive mounted?" >&2
        exit 1
    fi
done

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building images"
# --pull starts from the latest JDownloader and Node images
compose build --pull

echo "==> Stopping containers"
compose down

echo "==> Starting containers"
# Waits for JDownloader's API too: the first start downloads JDownloader's update and can take some minutes
compose up -d --wait

compose ps
