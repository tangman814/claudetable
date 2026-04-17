FROM node:22-alpine
WORKDIR /app

COPY . .

RUN npm install

# Build using full binary paths (bypass npm workspace permission issues)
RUN node_modules/.bin/tsc --project backend/tsconfig.json
RUN node_modules/.bin/vite build --config frontend/vite.config.ts

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
