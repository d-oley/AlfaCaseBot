FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VUE_APP_CASE_ASSET_BASE_URL=/storage/alfa-cases
ENV VUE_APP_CASE_ASSET_BASE_URL=${VUE_APP_CASE_ASSET_BASE_URL}
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

ENV BACKEND_UPSTREAM=host.docker.internal:999 \
    ASSET_UPSTREAM=host.docker.internal:2479 \
    ML_UPSTREAM=host.docker.internal:5000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
