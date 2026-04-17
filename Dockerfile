FROM node:22-alpine
WORKDIR /app

# Copy all source files
COPY . .

# Install all dependencies (workspaces)
RUN npm install

# Build backend (TypeScript → dist/) and frontend (→ frontend/dist/)
RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
