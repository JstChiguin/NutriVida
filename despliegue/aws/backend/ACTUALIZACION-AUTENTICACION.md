# Actualización del microservicio de autenticación (B7)

`b7-autenticacion.sh` actualiza únicamente `nutrivida-autenticacion` en la EC2 `back`, dentro del proyecto Compose `nutrivida-backend`. Clínico y Agenda no se tocan.

## Qué cambia

La imagen `chiguin/nutrivida:autenticacion-95d7ab6` se construyó desde el commit `95d7ab6` de `main`. Incluye la corrección del registro con RUT duplicado, que ahora responde 409 en lugar de 503. Digest publicado en Docker Hub:

```
sha256:dc45227fe2abd0404da754fb04de079afe8b0cafd994f09188acb54bb5ef0b55
```

## Requisitos

- Haber completado B2 a B6: existen `/opt/nutrivida/backend/docker-compose.yml` y `.env`, y los tres servicios usan las imágenes `899e328`.
- Clínico en estado `healthy`.
- Sesión de Docker Hub iniciada en la instancia con un token de solo lectura. Al terminar: `sudo docker logout` y revocar el token.

## Comando

Reemplace `<commit>` y `<sha256-del-script>` por los valores indicados en el Pull Request.

```
curl -fsSL -o /tmp/b7.sh https://raw.githubusercontent.com/JstChiguin/NutriVida/<commit>/despliegue/aws/backend/b7-autenticacion.sh && echo '<sha256-del-script>  /tmp/b7.sh' | sha256sum -c - && sudo -n env CONFIRMO=SI bash /tmp/b7.sh 95d7ab6 sha256:dc45227fe2abd0404da754fb04de079afe8b0cafd994f09188acb54bb5ef0b55
```

Para agregar la prueba del 409 con un RUT ficticio ya existente, use `CONFIRMO=SI PRUEBA_409=SI`. Esa prueba crea y elimina un usuario ficticio en Atlas y no deja datos.

## Qué hace

1. Puertas previas sin cambios: confirma, entre otras cosas, que la imagen actual tiene etiqueta `autenticacion-<7 hex>`, que el contenedor pertenece al proyecto `nutrivida-backend`, que el digest descargado coincide, que Clínico está sano, que hay swap libre y que las variables del contenedor coinciden con el `.env`.
2. Si Autenticación ya usa la imagen nueva, termina sin cambios.
3. Respalda `.env` y `docker-compose.yml` (permiso 600), la huella de las variables, la configuración del contenedor y etiqueta la imagen anterior como `chiguin/nutrivida:autenticacion-previo-<fecha>`. Todo queda en `/opt/nutrivida/respaldo/b7-respaldo-<fecha>/`.
4. Ejecuta `ETIQUETA_IMAGENES=95d7ab6 docker compose up -d --no-deps --force-recreate servicio-autenticacion`.
5. Espera el estado `healthy` y ejecuta unas 25 comprobaciones: puerto, memoria, red, variables, JWT, CORS, comunicación con Clínico, errores en el registro, que Clínico y Agenda no se reiniciaron y que los contenedores `-previo` de B3 a B5 no cambiaron.
6. Si algo falla, revierte automáticamente a la imagen anterior.

El script no ejecuta `docker rm`, `docker compose rm`, `docker compose down` ni comandos de limpieza.

## Reversión

Automática: ante cualquier fallo posterior al reemplazo, el script recrea el servicio con la etiqueta anterior y confirma que responde 200 con la imagen previa.

Manual:

```
cd /opt/nutrivida/backend && sudo ETIQUETA_IMAGENES=899e328 docker compose up -d --no-deps --force-recreate servicio-autenticacion
```

La imagen `autenticacion-899e328` y la etiqueta `autenticacion-previo-<fecha>` se conservan. Los contenedores `-previo` creados por B3, B4 y B5 pertenecen al proyecto antiguo `nutrivida` y no son tocados.

## Regla para futuras actualizaciones del backend

Actualice siempre un servicio con etiqueta explícita y sin dependencias:

```
cd /opt/nutrivida/backend && sudo ETIQUETA_IMAGENES=<etiqueta> docker compose up -d --no-deps --force-recreate servicio-<nombre>
```

## Riesgo: `docker compose up -d` general

No ejecute `docker compose up -d` sin indicar un servicio y una etiqueta. El `.env` define una sola etiqueta (`ETIQUETA_IMAGENES=899e328`) para todos los servicios, así que un `up -d` general recrearía Autenticación con `autenticacion-899e328` y bajaría la corrección del 409. Se comprobó en el ensayo local.

Solución permanente, aún no aplicada: definir `ETIQUETA_AUTENTICACION` en el Compose con respaldo en `ETIQUETA_IMAGENES` (`autenticacion-${ETIQUETA_AUTENTICACION:-${ETIQUETA_IMAGENES:-aws}}`) y una variable equivalente para cada servicio. Cambiaría el Compose de producción y requiere autorización y pruebas propias.

## Pruebas realizadas (ensayo local aislado, sin producción)

Docker dentro de Docker, MongoDB desechable e imágenes reales de Clínico, Agenda y Autenticación, con contenedores `-previo` de otro proyecto.

- Actualización normal: salida 0 y 25 comprobaciones correctas, incluido 409 por RUT existente.
- Fallo inducido (imagen que termina al arrancar): reversión automática correcta.
- Segunda ejecución: sin cambios.
- Sin `CONFIRMO`, digest distinto y descarga rechazada: salida 1 sin cambios.
- Reversión manual y actualización de otros servicios con la misma regla: correctas.
- Simulados en el ensayo: la descarga de Docker Hub y la lectura del digest.

No ensayado: el inicio de sesión real en Docker Hub desde la EC2, el digest descargado en esa instancia y el consumo de memoria de la t3.micro.
