FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3282

USER node

CMD ["node", "dist/index.js"]
