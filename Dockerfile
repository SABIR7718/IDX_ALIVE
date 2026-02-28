# Use Ubuntu
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Update and install required packages
RUN apt update && \
    apt install -y wget unzip nodejs npm && \
    apt clean

# Set working directory
WORKDIR /app

# Download and extract your zip
RUN wget http://165.227.63.140:7718/idx.zip && \
    unzip idx.zip && \
    rm idx.zip

# Run the Node app
CMD ["node", "app.js"]
