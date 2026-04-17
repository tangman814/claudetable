FROM node:22-alpine
WORKDIR /app

# Copy all source files
COPY . .

# Install all dependencies (workspaces)
RUN npm install

# Fix execute permissions for all workspace binaries
RUN chmod -R +x node_modules/.bin backend/node_modules/.bin frontend/node_modules/.bin 2>/dev/null || true

# Build backend (TypeScript → dist/) and frontend (→ frontend/dist/)
RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
