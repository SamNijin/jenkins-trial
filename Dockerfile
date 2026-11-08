FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src
COPY public ./public

# Run as non-root (the built-in "node" user)
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
