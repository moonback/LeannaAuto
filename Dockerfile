FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY constitution ./constitution
RUN npm run build
CMD ["node","dist/cli.js"]
