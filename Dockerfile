# Use Ubuntu as base image
FROM ubuntu:22.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Make start.sh executable
RUN chmod +x start.sh

# Run the script
CMD ["./start.sh"]
