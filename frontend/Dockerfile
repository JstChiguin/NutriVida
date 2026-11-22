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
COPY --from=construccion /aplicacion/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/ubicaciones.conf nginx/proxy-comun.conf nginx/seguridad.conf nginx/csp.conf /etc/nginx/nutrivida/
RUN sed -i 's/\r$//' /etc/nginx/templates/default.conf.template /etc/nginx/nutrivida/*.conf
ENV PROXY_CONFIABLE=172.16.0.0/12
ENV NGINX_ENVSUBST_FILTER="^(IP_BACKEND_PRIVADA|PROXY_CONFIABLE)$"
EXPOSE 80