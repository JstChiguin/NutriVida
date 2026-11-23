import http.server
import sys

PUERTO = int(sys.argv[1])
ARCHIVO_IP = sys.argv[2]
TOKEN = "token-de-prueba"


class Manejador(http.server.BaseHTTPRequestHandler):
    def responder(self, codigo, cuerpo=""):
        datos = cuerpo.encode()
        self.send_response(codigo)
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def do_PUT(self):
        if self.path == "/latest/api/token" and self.headers.get("X-aws-ec2-metadata-token-ttl-seconds"):
            self.responder(200, TOKEN)
        else:
            self.responder(400)

    def do_GET(self):
        if self.headers.get("X-aws-ec2-metadata-token") != TOKEN:
            self.responder(401)
            return
        if self.path == "/latest/meta-data/public-ipv4":
            with open(ARCHIVO_IP, encoding="utf-8") as archivo:
                self.responder(200, archivo.read().strip())
        else:
            self.responder(404)

    def log_message(self, formato, *argumentos):
        pass


http.server.HTTPServer(("127.0.0.1", PUERTO), Manejador).serve_forever()
