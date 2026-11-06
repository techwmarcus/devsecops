FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_AWS_REGION
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_USER_POOL_CLIENT_ID
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_USER_POOL_CLIENT_ID=$VITE_COGNITO_USER_POOL_CLIENT_ID
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
