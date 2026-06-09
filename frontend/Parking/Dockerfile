FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --force
COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3001

CMD ["serve", "-s", "build", "-l", "3001"]