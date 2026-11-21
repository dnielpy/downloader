# JDownloader 2, headless, with its local HTTP API ("Deprecated API") turned on so the web can drive it.
# update.sh builds with --pull, so every update starts from the latest base image.
FROM jlesage/jdownloader-2:latest

# jq edits JDownloader's JSON config at start, curl is for the healthcheck
RUN add-pkg jq curl

COPY rootfs/ /

ENV JDOWNLOADER_HEADLESS=1 \
    JD_API_PORT=3128

# The first start downloads JDownloader's own update, which can take minutes on a slow connection.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10m --retries=4 \
    CMD curl -fsS "http://127.0.0.1:${JD_API_PORT}/jd/version" > /dev/null || exit 1
