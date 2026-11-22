FROM node:22-alpine AS construccion
WORKDIR /aplicacion
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_URL_AUTENTICACION=/autenticacion
ARG VITE_URL_CLINICO=/clinico
ARG VITE_URL_AGENDA=/agenda
ENV VITE_URL_AUTENTICACION=${VITE_URL_AUTENTICACION}
ENV VITE_URL_CLINICO=${VITE_URL_CLINICO}
ENV VITE_URL_AGENDA=${VITE_URL_AGENDA}
RUN npm run build

FROM nginx:stable-alpine
RUN apk add --no-cache openssl
COPY --from=construccion /aplicacion/dist /usr/share/nginx/html
COPY nginx/http.conf.template nginx/https.conf.template /etc/nginx/plantillas/
COPY nginx/ubicaciones.conf nginx/proxy-comun.conf nginx/seguridad.conf nginx/csp.conf /etc/nginx/nutrivida/
COPY nginx/15-preparar-nginx.sh /docker-entrypoint.d/15-preparar-nginx.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/15-preparar-nginx.sh /etc/nginx/plantillas/*.template /etc/nginx/nutrivida/*.conf \
    && chmod +x /docker-entrypoint.d/15-preparar-nginx.sh
ENV MODO_TLS=https
ENV SUFIJO_PUERTO_HTTPS=
ENV PROXY_CONFIABLE=172.16.0.0/12
ENV NGINX_ENVSUBST_FILTER="^(IP_BACKEND_PRIVADA|SUFIJO_PUERTO_HTTPS|PROXY_CONFIABLE)$"
EXPOSE 80 443
