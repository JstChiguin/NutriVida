# Despliegue de NutriVida en AWS (Learner Lab)

Respaldo versionado de la infraestructura desplegada: una EC2 pública con Caddy (HTTPS) y Nginx con React, y una EC2 en subred privada con los tres microservicios Spring Boot, conectada a MongoDB Atlas por NAT Gateway. Los archivos de esta guía no modifican el `docker-compose.yml` local.

## 1. Arquitectura

```
Navegador ──HTTPS 443──> EC2 pública
                           Caddy (contenedor, red host, 443, Let's Encrypt)
                             │ reverse_proxy 127.0.0.1:80
                           Nginx + React (puerto 80, solo local)
                             │  /autenticacion/ -> IP_BACKEND_PRIVADA:8081
                             │  /clinico/       -> IP_BACKEND_PRIVADA:8082
                             │  /agenda/        -> IP_BACKEND_PRIVADA:8083
                             ▼
                        EC2 privada (3 microservicios) ──NAT Gateway──> MongoDB Atlas (27017)
```

El navegador solo habla con Caddy, en el mismo origen: no hay CORS ni contenido mixto. Administración de ambas instancias por AWS Systems Manager (sin SSH público).

## 2. Qué está versionado

| Archivo | Uso |
|---|---|
| `despliegue/aws/frontend/docker-compose.yml` y `.env.example` | Nginx con React en el puerto 80, publicado solo en `127.0.0.1` por defecto. |
| `despliegue/aws/frontend/docker-compose.caddy.yml` y `Caddyfile` | Caddy en contenedor independiente, red `host`, certificados en volúmenes persistentes. |
| `despliegue/aws/backend/docker-compose.yml` y `.env.example` | Tres microservicios con healthcheck. Atlas por `NUTRIVIDA_MONGO_URI`. MongoDB en contenedor solo con `--profile mongo-local`. |
| `frontend/Dockerfile` y `frontend/nginx/` | Imagen del frontend: plantillas HTTP y HTTPS, rutas de proxy, cabeceras de seguridad. |
| `backend/servicio-*/src/main/resources/application.yml` | `NUTRIVIDA_FORWARD_HEADERS` (por defecto `none`; en AWS `framework`). |

Las imágenes siguen el esquema `chiguin/nutrivida:autenticacion-aws`, `clinico-aws`, `agenda-aws` y `frontend-aws`.

No están versionados, porque son recursos de AWS que se gestionan en la consola: instancias, subredes, NAT Gateway, grupos de seguridad, roles de Systems Manager y la configuración de Atlas. La sección 6 los describe como referencia.

## 3. Variables de entorno (solo en el `.env` de cada instancia, nunca en Git)

| Variable | Dónde | Descripción |
|---|---|---|
| `NUTRIVIDA_MONGO_URI` | backend | Cadena de conexión de Atlas (obligatoria) |
| `NUTRIVIDA_JWT_SECRETO` | backend | Mínimo 32 caracteres, igual en los tres servicios |
| `NUTRIVIDA_JWT_EXPIRACION_MINUTOS` | backend | Vigencia del token; 60 por defecto |
| `NUTRIVIDA_ADMIN_CORREO` y `NUTRIVIDA_ADMIN_CONTRASENA` | backend | Administrador inicial, solo si la base está vacía |
| `JAVA_OPCIONES` | backend | Límites de memoria de la JVM (`-Xms64m -Xmx256m` por defecto) |
| `IP_BACKEND_PRIVADA` | frontend | IP privada de la instancia de backend (obligatoria) |
| `MODO_TLS` | frontend | `http` (por defecto, detrás de Caddy) o `https` (certificado autofirmado, solo pruebas locales) |
| `IP_ESCUCHA` y `PUERTO_HTTP` | frontend | Interfaz y puerto de Nginx en el host; `127.0.0.1` y `80` por defecto |
| `PROXY_CONFIABLE` | frontend | Rango desde el que Nginx acepta `X-Forwarded-Proto`; `172.16.0.0/12` (redes de Docker) por defecto |
| `DOMINIO_PUBLICO` | Caddy | Nombre público, por ejemplo `A-B-C-D.sslip.io` con la IP pública con guiones (obligatoria) |
| `PUERTO_NGINX` | Caddy | Puerto local de Nginx; `80` por defecto |

Crear cada `.env` con `chmod 600`. Atlas necesita un usuario con lectura y escritura, `collMod` y `createIndex` sobre la base, porque cada servicio aplica validadores de esquema y crea índices al iniciar.

## 4. Proxy inverso y protocolo original

Caddy termina TLS y reenvía a Nginx por `127.0.0.1`. Nginx acepta `X-Forwarded-Proto` solo si la conexión llega desde `127.0.0.0/8` o desde `PROXY_CONFIABLE`. Para cualquier otro origen usa el protocolo real de su propia conexión, de modo que un cliente externo no puede fingir `https`. Como Nginx se publica únicamente en `127.0.0.1`, solo Caddy alcanza ese puerto. Spring Boot recibe el valor con `forward-headers-strategy=framework`.

Caddy sobrescribe `X-Forwarded-*` de los clientes (no tiene `trusted_proxies`). Con `auto_https disable_redirects` no abre el puerto 80, que es de Nginx: la validación de Let's Encrypt usa TLS-ALPN sobre el 443, así que el grupo de seguridad solo necesita ese puerto. La redirección de HTTP a HTTPS no se hace.

## 5. HTTPS con Caddy y Let's Encrypt

Reemplazar `A-B-C-D` por la IP pública con guiones (la IP de Learner Lab cambia al reiniciar las instancias). En `despliegue/aws/frontend`:

```bash
echo "DOMINIO_PUBLICO=A-B-C-D.sslip.io" >> .env
docker compose -f docker-compose.caddy.yml up -d
```

Los certificados quedan en el volumen `caddy_datos` del proyecto `nutrivida-caddy` (visible con `docker volume ls`), que sobrevive a reinicios y recreaciones del contenedor. Si el Caddy de producción se creó con otro nombre de volumen, no se debe cambiar a este sin migrarlo: no se comprobó el nombre real en AWS.

Verificación de HTTPS (solo lectura):

```bash
curl -sSI https://A-B-C-D.sslip.io/
openssl s_client -connect A-B-C-D.sslip.io:443 -servername A-B-C-D.sslip.io </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates
docker logs --tail 50 nutrivida-https
```

El emisor debe ser Let's Encrypt y las fechas deben estar vigentes. No se activa HSTS mientras el dominio sea temporal. El modo `MODO_TLS=https` (certificado autofirmado de 30 días) es solo para pruebas locales y no sirve como solución pública.

## 6. Controles de seguridad (estado informado del despliegue real)

| Control | Estado |
|---|---|
| Frontend público: entrada solo TCP 443 desde Internet | Verificado en AWS |
| Backend 8081–8083 solo desde la IP privada del frontend | Verificado en AWS |
| Administración por AWS Systems Manager, sin SSH público | Verificado en AWS |
| Salida del backend a Atlas por NAT Gateway; tres conexiones TCP al 27017 | Verificado en AWS |
| HTTPS y proxy inverso con respuestas 200 y 401 | Verificado en AWS |
| Contenedor `nutrivida-frontend` escuchando solo en `127.0.0.1:80` | Verificado en AWS |
| Contenedor `nutrivida-https` (Caddy 2, red `host`) con proxy a `127.0.0.1:80` | Verificado en AWS |
| Puertos públicos 80 y 22 cerrados (grupo `gsfrontend` solo con TCP 443) | Verificado en AWS |
| `HTTP/2 200` en el frontend y `HTTP/2 401` sin JWT hacia el backend privado | Verificado en AWS |
| Atlas: la IP Access List contiene solo direcciones `/32`, incluida `184.197.245.138/32`, y ninguna regla `0.0.0.0/0` | Verificado en la consola de Atlas (captura) |
| Login, JWT, roles y CRUD de extremo a extremo en AWS | **Pendiente de prueba** |

No hay secretos en el repositorio: `.env`, certificados y claves están en `.gitignore` y solo se versionan los `.env.example`.

## 7. Pasos de despliegue

1. Construir las imágenes en un equipo con Docker: `docker compose build` en `despliegue/aws/backend` y en `despliegue/aws/frontend`.
2. Entregar las imágenes a cada instancia (por registro, o con `docker save` y `docker load` mediante una sesión de Systems Manager).
3. Backend: copiar `docker-compose.yml`, crear el `.env`, `docker compose up -d`. Esperar a que los tres servicios estén `healthy`.
4. Frontend: copiar `docker-compose.yml`, crear el `.env` con `IP_BACKEND_PRIVADA`, `docker compose up -d`.
5. Caddy: copiar `docker-compose.caddy.yml` y `Caddyfile`, definir `DOMINIO_PUBLICO`, `docker compose -f docker-compose.caddy.yml up -d`.
6. Datos ficticios: `node --env-file=.env scripts/sembrar-datos-demo.mjs`, con `NUTRIVIDA_URL_AUTENTICACION`, `NUTRIVIDA_URL_CLINICO` y `NUTRIVIDA_URL_AGENDA` apuntando a `https://DOMINIO/autenticacion`, `/clinico` y `/agenda`.

## 8. Recuperación

- **La IP pública cambió:** actualizar `DOMINIO_PUBLICO` con la IP nueva y reiniciar solo Caddy (`docker compose -f docker-compose.caddy.yml up -d`). Caddy emite un certificado nuevo. Let's Encrypt limita las emisiones por dominio, así que no se debe recrear el volumen sin necesidad.
- **Falla el frontend:** en producción existe `nutrivida-frontend-respaldo`, detenido, para recuperación. Detener `nutrivida-frontend`, iniciar el de respaldo con el mismo puerto local y comprobar `curl -sSI http://127.0.0.1/`.
- **Se perdió el contenedor de Caddy:** el volumen conserva los certificados; basta con volver a levantarlo con el mismo `.env`.
- **Se perdió el volumen de Caddy:** Caddy vuelve a emitir al iniciar, si el dominio sigue siendo alcanzable por el puerto 443.
- **Se perdió una instancia:** recrearla, volver a cargar las imágenes y copiar el `.env` desde el respaldo seguro fuera de Git. Atlas conserva los datos.
- **El backend no llega a Atlas:** revisar en la consola la ruta `0.0.0.0/0` hacia el NAT Gateway y la lista de IP permitidas de Atlas (la IP de salida del NAT).
- **Un servicio se detiene:** Nginx responde 503 con JSON `SERVICIO_NO_DISPONIBLE`; `restart: unless-stopped` lo levanta de nuevo.

## 9. Limitaciones

- Las IP públicas de Learner Lab cambian al reiniciar y las instancias se apagan al terminar la sesión.
- Cada microservicio usa entre 300 y 345 MiB medidos con `-Xmx256m`; el backend necesita al menos 2 GiB.
- Let's Encrypt, el NAT Gateway y la lista de acceso de Atlas solo se verificaron en el despliegue real y en la consola de Atlas, no en las pruebas locales de este repositorio.
