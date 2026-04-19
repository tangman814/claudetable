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

# Build backend + frontend via workspace scripts
RUN npm run build

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
