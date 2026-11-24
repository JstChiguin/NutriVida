# Actualización del frontend (B8)

`b8-frontend.sh` actualiza únicamente `nutrivida-frontend` en la EC2 `front`, dentro del proyecto Compose `nutrivida-frontend`. Caddy, el certificado HTTPS, la automatización del dominio y los tres microservicios del backend no se tocan.

## Qué cambia

La imagen `chiguin/nutrivida:frontend-617eb96` se construyó desde el commit `617eb96` de `main`. Incluye la corrección del formulario de contacto, que ahora envía la consulta a `POST /clinico/api/v1/solicitudes-contacto` y muestra la confirmación solo si el servicio responde con éxito. Digest publicado en Docker Hub:

```
sha256:d0a536395c274cc78fef3151702e78fcb135a9fa8f66e8077c249af3043c941a
```

## Requisitos

- `/opt/nutrivida/frontend/docker-compose.yml` y `.env` existentes, con `nutrivida-frontend` en ejecución desde una imagen `chiguin/nutrivida:frontend-<7 hex>`.
- Caddy (`nutrivida-https`) en ejecución y el Caddyfile con el dominio `sslip.io` de la IP pública actual.
- Backend operativo (el script solo lo consulta).
- Sesión de Docker Hub iniciada en la instancia con un token de solo lectura: `sudo docker login -u <usuario>` y pegar el token cuando lo pida. Al terminar: `sudo docker logout` y revocar el token.

## Comando

Reemplace `<commit>` y `<sha256-del-script>` por los valores indicados en el Pull Request.

```
curl -fsSL -o /tmp/b8.sh https://raw.githubusercontent.com/JstChiguin/NutriVida/<commit>/despliegue/aws/frontend/b8-frontend.sh && echo '<sha256-del-script>  /tmp/b8.sh' | sha256sum -c - && sudo -n env CONFIRMO=SI bash /tmp/b8.sh 617eb96 sha256:d0a536395c274cc78fef3151702e78fcb135a9fa8f66e8077c249af3043c941a
```

## Qué hace

1. Puertas previas sin cambios: confirma, entre otras cosas, que la imagen actual tiene etiqueta `frontend-<7 hex>` y pertenece al proyecto `nutrivida-frontend`, que el digest descargado coincide, que Caddy está en ejecución, que el dominio corresponde a la IP pública, al DNS y al Caddyfile, que HTTPS y el backend responden, que hay memoria y que `IP_BACKEND_PRIVADA` del contenedor coincide con el `.env`.
2. Si el frontend ya usa la imagen nueva, termina sin cambios.
3. Respalda `.env` y `docker-compose.yml` (permiso 600) en `/opt/nutrivida/respaldo/b8-respaldo-<fecha>/` y etiqueta la imagen anterior como `chiguin/nutrivida:frontend-previo-<fecha>`.
4. Ejecuta `ETIQUETA_IMAGENES=617eb96 docker compose up -d --no-deps --no-build --pull never --force-recreate frontend`. El corte dura unos segundos, durante los cuales Caddy responde 502.
5. Espera la respuesta 200 y ejecuta unas 45 comprobaciones sin escribir datos: publicación solo en `127.0.0.1`, cabeceras de seguridad, rutas de la SPA, archivos ocultos, rutas internas bloqueadas, proxy a los tres servicios, el JavaScript (rutas `/api/v1`, formulario de contacto nuevo), HTTPS, CORS, un envío de contacto inválido que debe dar 400, que Caddy, su certificado, el backend y los contenedores `-previo` no cambiaron.
6. Si algo falla, revierte automáticamente a la imagen anterior.

El script no ejecuta `docker rm`, `docker compose rm`, `docker compose down` ni comandos de limpieza, y no renombra contenedores.

## Reversión

Automática: ante cualquier fallo posterior al reemplazo, el script recrea el servicio con la etiqueta anterior y confirma que responde 200 con la imagen previa.

Manual:

```
cd /opt/nutrivida/frontend && sudo ETIQUETA_IMAGENES=<etiqueta-anterior> docker compose up -d --no-deps --no-build --pull never --force-recreate frontend
```

La etiqueta anterior se imprime al final del script (por ejemplo `899e328`). La imagen anterior, la etiqueta `frontend-previo-<fecha>` y las copias de `.env` y Compose se conservan.

## Mantener la imagen tras un `docker compose up -d` general

El Compose del frontend usa `frontend-${ETIQUETA_IMAGENES}` y el `.env` conserva la etiqueta anterior. Un `docker compose up -d` general recrearía el frontend con esa etiqueta y bajaría la corrección. Cuando la verificación termine bien, puede fijar la etiqueta nueva en el `.env` (el archivo no contiene secretos del frontend, pero se respalda igual):

```
cd /opt/nutrivida/frontend && sudo cp -p .env .env.respaldo-b8 && sudo sed -i 's/^ETIQUETA_IMAGENES=.*/ETIQUETA_IMAGENES=617eb96/' .env && sudo grep '^ETIQUETA_IMAGENES=' .env && sudo docker compose config --images
```

Debe mostrar `chiguin/nutrivida:frontend-617eb96`. Este paso no recrea ningún contenedor.

## Verificación funcional del formulario de contacto

Con datos exclusivamente ficticios, desde el navegador en el dominio publicado:

1. Abrir DevTools, pestaña Network, y enviar el formulario de Contacto con un correo y un mensaje nuevos.
2. Debe aparecer `POST /clinico/api/v1/solicitudes-contacto` con estado 201, y solo después la confirmación «¡Mensaje recibido con éxito!».
3. Iniciar sesión como administrador y abrir Administración → Solicitudes de contacto: la consulta debe aparecer con el prefijo `[Motivo: …]` y estado Pendiente.
4. En MongoDB Atlas, base `nutrivida`, colección `solicitudes_contacto`: debe existir un documento nuevo con el mismo correo y mensaje.
5. Reenviar exactamente el mismo formulario el mismo día: la respuesta debe ser 200 y la colección no debe tener un segundo documento.
6. Comprobar el resto del sitio: inicio, servicios, inicio de sesión, un panel de paciente o nutricionista, y que `/contacto` recargado con F5 sigue cargando.
7. Eliminar el documento ficticio desde Atlas.

No detenga el backend para provocar errores en producción. El comportamiento ante errores está cubierto por las pruebas automáticas del frontend.

## Pruebas realizadas (ensayo local aislado, sin producción)

Docker dentro de Docker con las imágenes reales del frontend, un backend simulado que responde con los códigos de la aplicación, un contenedor `nutrivida-https` simulado y un contenedor `-previo` de otro proyecto.

- Actualización normal: salida 0 y todas las comprobaciones correctas; el `-previo` no se alteró.
- Fallo inducido (imagen que termina al arrancar): reversión automática correcta.
- Segunda ejecución: sin cambios. Sin `CONFIRMO` y con digest distinto: salida sin cambios.
- Reversión manual: correcta.
- Simulados en el ensayo: la descarga de Docker Hub y la lectura del digest, la IP pública (IMDS), el DNS y el certificado.

No ensayado: Caddy y Let's Encrypt reales, el inicio de sesión de Docker Hub desde la EC2, el digest descargado en esa instancia, la comprobación de Autenticación, Clínico y Agenda con contenedores reales, la memoria de la t3.micro y la IP privada de la instancia.
