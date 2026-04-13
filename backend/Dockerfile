FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
