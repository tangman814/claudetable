FROM node:22-slim

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build backend (TypeScript → dist/)
RUN ./node_modules/.bin/tsc --project backend/tsconfig.json

# Build frontend (Vite → frontend/dist/)
RUN ./node_modules/.bin/vite build --config frontend/vite.config.ts

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
