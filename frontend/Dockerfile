# Stage 1: Build the React application
FROM node:18-slim AS builder

# Accept build arguments for production APIs
ARG VITE_API_BASE
ARG VITE_WHATSAPP_API_BASE

# Expose build arguments as environment variables for Vite
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_WHATSAPP_API_BASE=$VITE_WHATSAPP_API_BASE

# Set working directory
WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install npm packages
RUN npm install

# Copy application source code
COPY . .

# Compile optimized static bundle
RUN npm run build

# Stage 2: Serve compiled files using Nginx
FROM nginx:alpine

# Copy Nginx server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
