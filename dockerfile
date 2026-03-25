# backend/Dockerfile
FROM node:18-alpine

# Instalar dependências do sistema para o Prisma
RUN apk add --no-cache openssl

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci --only=production
RUN npx prisma generate

# Copiar código fonte
COPY src ./src

# Expor porta
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
