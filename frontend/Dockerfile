FROM oven/bun:1-alpine

WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code and config
COPY . .

EXPOSE 5173

ENV PORT=5173

CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
