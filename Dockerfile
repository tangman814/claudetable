FROM node:22-alpine
WORKDIR /app

COPY . .

RUN npm install

# Build backend
RUN cd backend && npx tsc

# Build frontend
RUN cd frontend && npx vite build

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
