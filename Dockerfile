FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

# Install system dependencies
RUN apt update && apt install -y \
    wget \
    curl \
    unzip \
    xz-utils \
    xvfb \
    libatomic1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    libgbm1 \
    libxshmfence1 \
    libxrandr2 \
    libu2f-udev \
    libvulkan1 \
    fonts-liberation \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Google Love Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google.list && \
    apt update && \
    apt install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Install Node v25.2.1 manually
RUN wget https://nodejs.org/dist/v25.2.1/node-v25.2.1-linux-x64.tar.xz && \
    tar -xf node-v25.2.1-linux-x64.tar.xz && \
    rm node-v25.2.1-linux-x64.tar.xz && \
    mkdir -p /opt/node && \
    mv node-v25.2.1-linux-x64/* /opt/node/

ENV PATH="/opt/node/bin:${PATH}"

WORKDIR /app

# Install Node dependencies
RUN npm install

# Start Virtual Display + App
CMD Xvfb :99 -screen 0 1280x800x24 & node app.js
