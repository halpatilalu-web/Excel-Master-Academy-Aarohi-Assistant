# Build the React frontend, then serve it together with the FastAPI backend.
FROM node:20-alpine AS frontend

# Pinned in package.json ("packageManager"), so Corepack provisions the same
# pnpm the lockfile was written with.


WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack pnpm install --frozen-lockfile

COPY index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN corepack pnpm build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_DB_PATH=/data/data.db \
    DEMO_ENABLED=0 \
    PORT=8000

WORKDIR /app

COPY server/requirements.txt ./server/requirements.txt
RUN python -m pip install --no-cache-dir -r server/requirements.txt

COPY server ./server
COPY --from=frontend /app/dist ./dist

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /data \
    && chown -R appuser:appuser /app /data

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/api/health', timeout=3)"

CMD ["sh", "-c", "cd /app/server && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
