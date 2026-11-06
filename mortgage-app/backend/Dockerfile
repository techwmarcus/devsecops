FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY calculator.js server.js schema.sql ./
USER node
EXPOSE 3001
CMD ["node", "server.js"]
