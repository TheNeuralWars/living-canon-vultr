FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY package.json ./
COPY lib lib
COPY canon canon
COPY public public
COPY server.js ./
ENV NODE_ENV=production VULTR_INFERENCE_MODE=mock
EXPOSE 3000
CMD ["node","server.js"]
