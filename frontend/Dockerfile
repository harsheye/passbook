# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Nginx Stage for static serving
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# COPY custom nginx conf if needed for index fallback
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
