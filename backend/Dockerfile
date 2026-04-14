FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate
COPY . .

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=builder --chown=appuser:appgroup /app ./

USER appuser
EXPOSE 3001
CMD ["node", "server.js"]
