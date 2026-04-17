FROM node:22-alpine
WORKDIR /app

# Install build tools globally (avoids workspace symlink permission issues)
RUN npm install -g typescript vite

COPY . .

RUN npm install

# Build backend
RUN cd backend && tsc

# Build frontend
RUN cd frontend && vite build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
