FROM oven/bun:1-alpine

WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile
COPY . .

EXPOSE 4174
ENV PORT=4174
CMD ["bun", "run", "dev"]
