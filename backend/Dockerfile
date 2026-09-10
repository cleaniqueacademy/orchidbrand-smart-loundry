FROM oven/bun:1-alpine

WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code and config
COPY . .

# Ensure data directory exists for SQLite
RUN mkdir -p data

EXPOSE 5000

ENV PORT=5000
ENV DATABASE_URL=file:/app/data/laundry.db

CMD ["bun", "run", "dev"]
