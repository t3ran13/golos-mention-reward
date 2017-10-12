FROM node:latest

COPY index.js package.json package-lock.json /code/
WORKDIR /code/
RUN npm install
