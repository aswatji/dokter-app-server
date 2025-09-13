# Dockerfile for CapRover deployment
FROM node:18

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Generate Prisma client (if using Prisma)
RUN npx prisma generate

# Expose the port your app runs on (CapRover will map this)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
