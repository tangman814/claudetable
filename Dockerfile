# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install ALL dependencies (including devDependencies for tsc + vite)
RUN npm install --include=dev

# Copy source code
COPY . .

# Build shared → backend → frontend
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install production dependencies only (recreates workspace symlinks)
RUN npm install --omit=dev

# Copy compiled shared package (needed at runtime via @claudetable/shared)
COPY --from=builder /app/shared/dist ./shared/dist

# Copy built artifacts
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
