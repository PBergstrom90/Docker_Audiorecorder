# Step 1: Use Node.js LTS as the base image
FROM node:20 AS builder

# Step 2: Set the working directory
WORKDIR /app

# Step 3: Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Step 4: Copy the source code and compile TypeScript
COPY . ./
RUN npx tsc

# Step 5: Create a production image
FROM node:20-slim

# Step 6: Set the working directory in the production image
WORKDIR /app

# Step 7: Copy only the necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Step 8: Expose the backend port
EXPOSE 5000

# Step 9: Start the backend server
CMD ["node", "dist/server.js"]
