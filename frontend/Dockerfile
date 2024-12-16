# Step 1: Build the Frontend
FROM node:20 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy only the package files first (to leverage Docker layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . ./

# Build the React application
RUN npm run build

# Step 2: Serve the Frontend with Nginx
FROM nginx:stable-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 for HTTP traffic
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

HEALTHCHECK CMD curl --fail http://localhost || exit 1