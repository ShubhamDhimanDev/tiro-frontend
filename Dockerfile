# Local dev image for the Next.js storefront (App Router).
#
# NOT a production image. Production deploys to the HestiaCP VPS as
# `next build` + `next start` under PM2/systemd behind an Nginx reverse
# proxy — see root CLAUDE.md. This Dockerfile only exists to make local dev
# reproducible under docker-compose.yml.
#
# STATUS (2026-09-10): defined and builds cleanly (`docker compose build
# node`), but not yet the adopted dev path — frontend-agent currently runs
# `next dev` natively on port 3000. See docker-compose.yml's header comment
# before switching over.

FROM node:22-alpine

WORKDIR /app

# Install dependencies in their own layer so source-only changes don't
# invalidate the npm cache.
COPY package.json package-lock.json* ./
RUN npm ci

# Seeds the image with the rest of the source so `docker compose build`
# produces a runnable image standalone. At runtime, docker-compose.yml bind-
# mounts the real ./frontend directory over this (with node_modules masked
# by a named volume — see that file's comments) so edits show up without a
# rebuild.
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
