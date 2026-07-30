# Этот Dockerfile оставлен для совместимости с локальной сборкой из packages/server,
# но рекомендуется собирать из КОРНЯ монорепо через `Dockerfile.server`.
# Пример: docker build -f ../../Dockerfile.server -t spinthe-server ../..
FROM node:20-alpine
WORKDIR /app
# Копируем весь монорепо
COPY ../../package.json ../../package-lock.json ./
COPY ../../packages/shared ./packages/shared
COPY ../../packages/server ./packages/server
RUN npm install --workspace=@spinthe/shared --workspace=@spinthe/server
RUN npx prisma generate --schema=./packages/server/prisma/schema.prisma
RUN npm run build -w @spinthe/server
ENV NODE_ENV=production
WORKDIR /app/packages/server
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
