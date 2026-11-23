# Dominio HTTPS automático para la EC2 del frontend

Después de encender el laboratorio, la EC2 `front` obtiene su IP pública con IMDSv2, calcula el dominio `sslip.io`, actualiza solo ese nombre en el Caddyfile, recarga Caddy sin reiniciarlo y comprueba que todo responde. No cambia la arquitectura: Bash más una unidad systemd.

## Archivos

| Archivo | Función |
|---|---|
| `nutrivida-dominio-automatico.sh` | Procedimiento completo (se instala como `/usr/local/sbin/nutrivida-dominio-automatico`). |
| `nutrivida-dominio-automatico.service` | Unidad systemd: `Type=simple`, `After=docker.service network-online.target`, sin `Requires`, `RuntimeMaxSec=1800`. |
| `dominio-automatico.conf.ejemplo` | Parámetros sin secretos (`/etc/nutrivida/dominio-automatico.conf`). |
| `instalador.plantilla.sh` y `generar-instalador.sh` | Generan el instalador de una sola ejecución con las huellas SHA-256 incrustadas y lo parten en bloques pegables. |
| `pruebas/` | Pruebas simuladas, con Caddy real y del instalador. |

## Flujo de `--aplicar` (lo que ejecuta systemd)

1. Si existe `/etc/nutrivida/dominio-automatico.desactivado`, no hace nada.
2. Bloqueo por directorio (`mkdir`) para impedir ejecuciones simultáneas.
3. Espera Docker y el contenedor `nutrivida-https` (18 intentos de 10 s). Nunca arranca ni crea contenedores.
4. IMDSv2: token de 60 s y `public-ipv4`. Rechaza IPs privadas, de enlace local o mal formadas. No hay IMDSv1 ni servicios externos.
5. Dominio `A-B-C-D.sslip.io` y comprobación de que el DNS resuelve a esa IP (12 intentos).
6. Lee el dominio del Caddyfile. Exige exactamente uno con formato de IP; si hay cero o varios, aborta.
7. Si no cambió: no toca Caddy y solo verifica.
8. Si cambió: verifica que `admin` no esté en `off`, genera un candidato con `sed` y comprueba por ida y vuelta que solo difiere el dominio. Lo valida con `caddy validate` dentro del contenedor, crea un respaldo con huella `.sha256`, escribe **en el mismo archivo** (conserva el inode del montaje), confirma que el contenedor ve la misma huella y ejecuta `caddy reload`. Si algo falla, restaura el respaldo.
9. Compara la huella del contenedor (ID, `StartedAt`, reinicios y montajes) antes y después.
10. HTTPS con verificación TLS completa (sin `-k`) y 13 comprobaciones de endpoints, con reintentos solo ante 000/502/503/504.
11. Guarda `/var/lib/nutrivida-dominio/estado` y registra en `/var/log/nutrivida-dominio.log` (sin secretos ni tokens).

Con `--modo-servicio` termina siempre con código 0, así que un fallo no bloquea el arranque. Los códigos reales se ven con `--estado` o ejecutándolo a mano.

Códigos: 20 Docker, 21 Caddy detenido, 22 IMDS, 23 DNS, 24 Caddyfile ambiguo o sin dominio, 25 Caddy rechazó la configuración, 26 recarga fallida (restaurado), 27 respaldo o integridad, 28 HTTPS no válido, 29 endpoints, 30 `admin off`, 31 ruta del montaje desconocida, 32 desactualizado en `--verificar`, 33 requisitos.

Si tras recargar falla el certificado o un endpoint, **no** se revierte: el dominio anterior ya no apunta a esta IP y Caddy sigue intentando emitir el certificado. La reversión automática se reserva para fallos de validación, escritura o recarga.

## Comandos

```
sudo nutrivida-dominio-automatico --verificar
sudo nutrivida-dominio-automatico --aplicar
sudo nutrivida-dominio-automatico --estado
sudo nutrivida-dominio-automatico --revertir [respaldo]
sudo nutrivida-dominio-automatico --desactivar
sudo nutrivida-dominio-automatico --reactivar
sudo nutrivida-dominio-automatico --desinstalar
tail -n 60 /var/log/nutrivida-dominio.log
```

`--desactivar` crea el interruptor y deshabilita la unidad. `--desinstalar` retira solo la unidad. Los respaldos, registros, configuración, imágenes, contenedores y certificados nunca se borran.

## CORS

Los tres servicios usan `NUTRIVIDA_FORWARD_HEADERS=framework` y Nginx reenvía `Host` y `X-Forwarded-Proto`, que Caddy envía como `https`. Para el navegador, `https://<dominio>` es el mismo origen que la API (`/autenticacion/`, `/clinico/`, `/agenda/`). Spring lo acepta sin que figure en `NUTRIVIDA_ORIGENES_PERMITIDOS`. Por eso **no hace falta coordinar con la EC2 back** para que el nuevo dominio funcione.

El script lo comprueba sin escribir datos. Un POST sin token con `Origin: https://<dominio>` debe dar 401. Un 403 significaría CORS rechazado. Un POST con un origen ajeno debe dar 403, para demostrar que CORS no está abierto. Se prueba en Autenticación, Agenda y Clínico.

Las entradas antiguas en `NUTRIVIDA_ORIGENES_PERMITIDOS` del backend quedan obsoletas pero no estorban. Como una IP liberada puede asignarse a otra cuenta, conviene limpiarlas cuando se pueda. Eso es una **propuesta, no se instala**: requiere un canal back←front (por ejemplo `ssm:SendCommand` con permisos IAM que no se asumen, o un archivo publicado por Nginx que el back consulte), y cualquiera de los dos cambia la arquitectura o los permisos.

## Pruebas

- **Simuladas** (`pruebas/pruebas-simuladas.sh`): `docker`, `curl` y DNS son dobles. Cubren IP sin cambios, IP modificada, idempotencia, reversión, DNS caído, Caddy detenido, Docker caído, IMDS caído o con IP privada, configuración inválida, fallo de recarga con restauración, montaje que no refleja el archivo, `admin off`, dominios ambiguos, certificado inválido, CORS rechazado, backend arrancando, interruptor, bloqueo y modo servicio. También comprueban que `docker` solo recibe `info`, `inspect`, `cp` y `exec`, que no se usa `-k` y que secretos, certificados y backend no cambian.
- **Caddy real** (`pruebas/pruebas-caddy-real.sh`, requiere Docker): contenedor `caddy:2` con el Caddyfile montado como archivo único y `tls internal`. Validan `caddy validate` y `caddy reload` reales, el certificado del dominio nuevo con verificación TLS (CA local), mismo contenedor y volúmenes, configuración inválida real, Caddy detenido y recuperación, `admin off` y reversión. Los endpoints son respuestas de Caddy, no del backend Spring.
- **Instalador** (`pruebas/pruebas-instalador.sh`, dentro de un contenedor Linux desechable): huella alterada, requisitos incumplidos, instalación, idempotencia, desactivar, reactivar y desinstalar.

## Solo verificable en AWS

IMDSv2 real; DNS real de `sslip.io`; certificado real de Let's Encrypt (límites de emisión incluidos); puertos 80 y 443 abiertos en el grupo de seguridad; el montaje real del Caddyfile y `admin` activo en `nutrivida-https`; respuestas reales de Nginx y los tres servicios Spring (incluido CORS de Spring); orden de arranque de systemd (`network-online`, `docker`) en la instancia; la versión de `curl` y del sistema operativo.
