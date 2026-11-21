#!/bin/sh
# Runs before JDownloader starts (after the image's own init scripts): turns on JDownloader's local HTTP API on
# JD_API_PORT and lets other containers reach it. The port is never published on the host, only the web uses it.
set -eu

cfg_dir=/config/cfg
file="$cfg_dir/org.jdownloader.api.RemoteAPIConfig.json"
port="${JD_API_PORT:-3128}"

mkdir -p "$cfg_dir"
# A missing or broken file starts from empty: JDownloader fills in the defaults for the other keys
if [ ! -s "$file" ] || ! jq empty "$file" 2> /dev/null; then
    echo '{}' > "$file"
fi

tmp="$(mktemp)"
jq --argjson port "$port" \
    '.deprecatedapienabled = true | .deprecatedapiport = $port | .deprecatedapilocalhostonly = false' \
    "$file" > "$tmp"
mv "$tmp" "$file"
chown "${USER_ID:-1000}:${GROUP_ID:-1000}" "$cfg_dir" "$file"
chmod 644 "$file"

echo "JDownloader local API enabled on port $port"
