# ConectaKing API – com ffmpeg para KingBrief (áudios longos, ex.: 1 hora)
FROM node:20-bookworm-slim

# Instala ffmpeg para o KingBrief poder dividir e transcrever áudios > 25 MB
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
