FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm install

# 2. Copy source code
COPY . .

# 3. Build TypeScript
RUN npm run build

# 4. Run compiled app
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.js"]
