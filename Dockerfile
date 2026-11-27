FROM node:22-alpine

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PORT=3001

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY index.html vite.config.js server.js ./
COPY mock-server ./mock-server
COPY data ./data
COPY src ./src

RUN npm run build

EXPOSE 3001

CMD ["node", "server.js"]
