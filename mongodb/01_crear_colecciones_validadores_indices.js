use('nutrivida_taller');

const esquemas = {
  "agendas": {
    "bsonType": "object",
    "required": [
      "horariosSemanales",
      "bloqueos",
      "activa"
    ],
    "properties": {
      "_id": {
        "bsonType": "objectId"
      },
      "activa": {
        "bsonType": "bool"
      },
      "horariosSemanales": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": [
            "dia",
            "horaInicio",
            "horaFin"
          ],
          "properties": {
            "dia": {
              "enum": [
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY"
              ]
            },
            "horaInicio": {
              "bsonType": "string",
              "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$"
            },
            "horaFin": {
              "bsonType": "string",
              "pattern": "^([01]\\d|2[0-3]):[0-5]\\d$"
            }
          }
        }
      },
      "bloqueos": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": [
            "identificador",
            "inicio",
            "fin",
            "motivo",
            "tipo"
          ],
          "properties": {
            "inicio": {
              "bsonType": "date"
            },
            "fin": {
              "bsonType": "date"
            },
            "tipo": {
              "enum": [
                "BLOQUEO",
                "AUSENCIA"
              ]
            }
          }
        }
      }
    }
  },
  "citas": {
    "bsonType": "object",
    "required": [
      "pacienteId",
      "nutricionistaId",
      "servicioId",
      "duracionMinutos",
      "inicio",
      "fin",
      "motivoConsulta",
      "estado",
      "historialEstados"
    ],
    "properties": {
      "pacienteId": {
        "bsonType": "objectId"
      },
      "nutricionistaId": {
        "bsonType": "objectId"
      },
      "servicioId": {
        "bsonType": "objectId"
      },
      "duracionMinutos": {
        "bsonType": [
          "int",
          "long"
        ],
        "minimum": 15,
        "maximum": 180
      },
      "inicio": {
        "bsonType": "date"
      },
      "fin": {
        "bsonType": "date"
      },
      "estado": {
        "enum": [
          "SOLICITADA",
          "CONFIRMADA",
          "RECHAZADA",
          "CANCELADA",
          "REALIZADA",
          "INASISTENCIA"
        ]
      },
      "pagada": {
        "bsonType": "bool"
      },
      "historialEstados": {
        "bsonType": "array",
        "minItems": 1,
        "items": {
          "bsonType": "object",
          "required": [
            "evento",
            "estado",
            "fecha"
          ],
          "properties": {
            "evento": {
              "enum": [
                "SOLICITUD",
                "CONFIRMACION",
                "RECHAZO",
                "CANCELACION",
                "REPROGRAMACION",
                "ATENCION_REALIZADA",
                "INASISTENCIA"
              ]
            },
            "estado": {
              "enum": [
                "SOLICITADA",
                "CONFIRMADA",
                "RECHAZADA",
                "CANCELADA",
                "REALIZADA",
                "INASISTENCIA"
              ]
            },
            "fecha": {
              "bsonType": "date"
            }
          }
        }
      }
    }
  },
  "fichas_clinicas": {
    "bsonType": "object",
    "required": [
      "pacienteId",
      "nutricionistaResponsableId",
      "fechaApertura",
      "motivoConsulta",
      "estado",
      "evoluciones"
    ],
    "properties": {
      "pacienteId": {
        "bsonType": "objectId"
      },
      "nutricionistaResponsableId": {
        "bsonType": "objectId"
      },
      "fechaApertura": {
        "bsonType": "date"
      },
      "motivoConsulta": {
        "bsonType": "string",
        "minLength": 1
      },
      "estado": {
        "enum": [
          "ABIERTA",
          "CERRADA"
        ]
      },
      "alergias": {
        "bsonType": "array",
        "items": {
          "bsonType": "string"
        }
      },
      "intolerancias": {
        "bsonType": "array",
        "items": {
          "bsonType": "string"
        }
      },
      "evoluciones": {
        "bsonType": "array",
        "items": {
          "bsonType": "object",
          "required": [
            "identificador",
            "fecha",
            "nutricionistaId",
            "descripcion",
            "corregida"
          ],
          "properties": {
            "identificador": {
              "bsonType": "string"
            },
            "fecha": {
              "bsonType": "date"
            },
            "nutricionistaId": {
              "bsonType": "objectId"
            },
            "descripcion": {
              "bsonType": "string"
            },
            "corregida": {
              "bsonType": "bool"
            }
          }
        }
      }
    }
  },
  "mediciones": {
    "bsonType": "object",
    "required": [
      "pacienteId",
      "nutricionistaId",
      "fecha",
      "pesoKg",
      "estaturaCm",
      "imc",
      "estado"
    ],
    "properties": {
      "pacienteId": {
        "bsonType": "objectId"
      },
      "nutricionistaId": {
        "bsonType": "objectId"
      },
      "fecha": {
        "bsonType": "date"
      },
      "pesoKg": {
        "bsonType": [
          "double",
          "int"
        ],
        "minimum": 2,
        "maximum": 400
      },
      "estaturaCm": {
        "bsonType": [
          "double",
          "int"
        ],
        "minimum": 40,
        "maximum": 250
      },
      "imc": {
        "bsonType": [
          "double",
          "int"
        ],
        "minimum": 1,
        "maximum": 200
      },
      "cinturaCm": {
        "bsonType": [
          "double",
          "int",
          "null"
        ],
        "minimum": 20,
        "maximum": 250
      },
      "estado": {
        "enum": [
          "VIGENTE",
          "ANULADA"
        ]
      }
    }
  },
  "nutricionistas": {
    "bsonType": "object",
    "required": [
      "usuarioId",
      "nombreCompleto",
      "especialidades",
      "serviciosIds",
      "activo",
      "creadoEn"
    ],
    "properties": {
      "usuarioId": {
        "bsonType": "objectId"
      },
      "nombreCompleto": {
        "bsonType": "string",
        "minLength": 3,
        "maxLength": 120
      },
      "especialidades": {
        "bsonType": "array",
        "minItems": 1,
        "items": {
          "bsonType": "string"
        }
      },
      "serviciosIds": {
        "bsonType": "array",
        "items": {
          "bsonType": "objectId"
        }
      },
      "activo": {
        "bsonType": "bool"
      },
      "creadoEn": {
        "bsonType": "date"
      }
    }
  },
  "ocupaciones_agenda": {
    "bsonType": "object",
    "required": [
      "nutricionistaId",
      "bloqueInicio",
      "citaId"
    ],
    "properties": {
      "nutricionistaId": {
        "bsonType": "objectId"
      },
      "bloqueInicio": {
        "bsonType": "date"
      },
      "citaId": {
        "bsonType": "objectId"
      }
    }
  },
  "pacientes": {
    "bsonType": "object",
    "required": [
      "usuarioId",
      "nombreCompleto",
      "correo",
      "activo",
      "nutricionistasAutorizados",
      "creadoEn"
    ],
    "properties": {
      "usuarioId": {
        "bsonType": "objectId"
      },
      "nombreCompleto": {
        "bsonType": "string",
        "minLength": 3,
        "maxLength": 120
      },
      "rut": {
        "bsonType": [
          "string",
          "null"
        ],
        "pattern": "^\\d{7,8}-[\\dK]$"
      },
      "correo": {
        "bsonType": "string"
      },
      "telefono": {
        "bsonType": [
          "string",
          "null"
        ]
      },
      "fechaNacimiento": {
        "bsonType": [
          "string",
          "null"
        ],
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "sexo": {
        "enum": [
          "FEMENINO",
          "MASCULINO",
          "OTRO",
          "NO_INFORMA",
          null
        ]
      },
      "activo": {
        "bsonType": "bool"
      },
      "nutricionistasAutorizados": {
        "bsonType": "array",
        "items": {
          "bsonType": "objectId"
        }
      },
      "creadoEn": {
        "bsonType": "date"
      }
    }
  },
  "pagos": {
    "bsonType": "object",
    "required": [
      "citaId",
      "pacienteId",
      "monto",
      "estado",
      "metodo",
      "creadoEn"
    ],
    "properties": {
      "citaId": {
        "bsonType": "objectId"
      },
      "pacienteId": {
        "bsonType": "objectId"
      },
      "monto": {
        "bsonType": [
          "int",
          "long"
        ],
        "minimum": 0
      },
      "estado": {
        "enum": [
          "APROBADO_SIMULADO",
          "RECHAZADO_SIMULADO",
          "ANULADO"
        ]
      },
      "metodo": {
        "enum": [
          "TARJETA_SIMULADA",
          "TRANSFERENCIA_SIMULADA",
          "EFECTIVO_SIMULADO"
        ]
      },
      "creadoEn": {
        "bsonType": "date"
      }
    }
  },
  "planes_alimentarios": {
    "bsonType": "object",
    "required": [
      "pacienteId",
      "nutricionistaId",
      "numeroVersion",
      "estado",
      "vigenteDesde",
      "objetivos",
      "comidas"
    ],
    "properties": {
      "pacienteId": {
        "bsonType": "objectId"
      },
      "nutricionistaId": {
        "bsonType": "objectId"
      },
      "numeroVersion": {
        "bsonType": [
          "int",
          "long"
        ],
        "minimum": 1
      },
      "estado": {
        "enum": [
          "VIGENTE",
          "REEMPLAZADO",
          "FINALIZADO"
        ]
      },
      "vigenteDesde": {
        "bsonType": "string",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
      },
      "objetivos": {
        "bsonType": "array",
        "minItems": 1,
        "items": {
          "bsonType": "string"
        }
      },
      "comidas": {
        "bsonType": "array",
        "minItems": 1,
        "items": {
          "bsonType": "object",
          "required": [
            "nombre",
            "alimentos"
          ],
          "properties": {
            "nombre": {
              "bsonType": "string"
            },
            "alimentos": {
              "bsonType": "array",
              "items": {
                "bsonType": "object",
                "required": [
                  "alimento",
                  "cantidad",
                  "unidad"
                ],
                "properties": {
                  "alimento": {
                    "bsonType": "string"
                  },
                  "cantidad": {
                    "bsonType": [
                      "double",
                      "int"
                    ],
                    "minimum": 0
                  },
                  "unidad": {
                    "bsonType": "string"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "servicios": {
    "bsonType": "object",
    "required": [
      "nombre",
      "descripcion",
      "categoria",
      "duracionMinutos",
      "precioReferencial",
      "activo",
      "creadoEn"
    ],
    "properties": {
      "nombre": {
        "bsonType": "string",
        "minLength": 3,
        "maxLength": 100
      },
      "descripcion": {
        "bsonType": "string",
        "maxLength": 500
      },
      "categoria": {
        "bsonType": "string"
      },
      "duracionMinutos": {
        "bsonType": [
          "int",
          "long"
        ],
        "minimum": 15,
        "maximum": 180
      },
      "precioReferencial": {
        "bsonType": [
          "int",
          "long"
        ],
        "minimum": 0
      },
      "activo": {
        "bsonType": "bool"
      },
      "creadoEn": {
        "bsonType": "date"
      }
    }
  },
  "solicitudes_contacto": {
    "bsonType": "object",
    "required": [
      "nombre",
      "correo",
      "mensaje",
      "estado",
      "claveDuplicado",
      "creadoEn"
    ],
    "properties": {
      "nombre": {
        "bsonType": "string",
        "minLength": 3
      },
      "correo": {
        "bsonType": "string"
      },
      "mensaje": {
        "bsonType": "string",
        "minLength": 10,
        "maxLength": 1000
      },
      "estado": {
        "enum": [
          "PENDIENTE",
          "EN_REVISION",
          "RESUELTA"
        ]
      },
      "claveDuplicado": {
        "bsonType": "string"
      },
      "creadoEn": {
        "bsonType": "date"
      }
    }
  },
  "tokens_revocados": {
    "bsonType": "object",
    "required": [
      "usuarioId",
      "revocadoEn",
      "expiraEn"
    ],
    "properties": {
      "usuarioId": {
        "bsonType": "string"
      },
      "revocadoEn": {
        "bsonType": "date"
      },
      "expiraEn": {
        "bsonType": "date"
      }
    }
  },
  "usuarios": {
    "bsonType": "object",
    "required": [
      "correo",
      "hashContrasena",
      "nombreCompleto",
      "rol",
      "activo",
      "creadoEn"
    ],
    "properties": {
      "correo": {
        "bsonType": "string",
        "pattern": "^[^@\\s]+@[^@\\s]+$"
      },
      "hashContrasena": {
        "bsonType": "string",
        "minLength": 20
      },
      "nombreCompleto": {
        "bsonType": "string",
        "minLength": 3,
        "maxLength": 120
      },
      "rol": {
        "enum": [
          "ADMINISTRADOR",
          "NUTRICIONISTA",
          "PACIENTE"
        ]
      },
      "activo": {
        "bsonType": "bool"
      },
      "creadoEn": {
        "bsonType": "date"
      },
      "actualizadoEn": {
        "bsonType": "date"
      },
      "ultimoAcceso": {
        "bsonType": [
          "date",
          "null"
        ]
      }
    }
  }
};

const coleccionesConEsquema = Object.keys(esquemas);

coleccionesConEsquema.forEach((coleccion) => {
  const validador = { $jsonSchema: esquemas[coleccion] };
  if (db.getCollectionNames().includes(coleccion)) {
    db.runCommand({ collMod: coleccion, validator: validador, validationLevel: 'moderate', validationAction: 'error' });
  } else {
    db.createCollection(coleccion, { validator: validador, validationLevel: 'moderate', validationAction: 'error' });
  }
});
if (!db.getCollectionNames().includes('auditorias')) {
  db.createCollection('auditorias');
}

db.usuarios.createIndex({ correo: 1 }, { unique: true });
db.tokens_revocados.createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0 });
db.pacientes.createIndex({ usuarioId: 1 }, { unique: true });
db.pacientes.createIndex({ rut: 1 }, { unique: true, sparse: true });
db.nutricionistas.createIndex({ usuarioId: 1 }, { unique: true });
db.nutricionistas.createIndex({ especialidades: 1 });
db.servicios.createIndex({ nombre: 1 }, { unique: true });
db.servicios.createIndex({ categoria: 1 });
db.fichas_clinicas.createIndex({ pacienteId: 1 }, { unique: true });
db.mediciones.createIndex({ pacienteId: 1, fecha: -1 });
db.planes_alimentarios.createIndex({ pacienteId: 1, numeroVersion: 1 }, { unique: true });
db.planes_alimentarios.createIndex(
  { pacienteId: 1 },
  { unique: true, partialFilterExpression: { estado: 'VIGENTE' }, name: 'un_plan_vigente_por_paciente' },
);
db.solicitudes_contacto.createIndex({ claveDuplicado: 1 }, { unique: true });
db.solicitudes_contacto.createIndex({ estado: 1 });
db.citas.createIndex({ nutricionistaId: 1, inicio: 1 });
db.citas.createIndex({ pacienteId: 1, inicio: 1 });
db.citas.createIndex({ estado: 1, inicio: 1 });
db.ocupaciones_agenda.createIndex({ citaId: 1 });
db.pagos.createIndex({ citaId: 1 });
db.pagos.createIndex({ pacienteId: 1 });
db.auditorias.createIndex({ entidad: 1, entidadId: 1 });
db.auditorias.createIndex({ fecha: -1 });

print(`Colecciones creadas en la base ${db.getName()}:`);
db.getCollectionNames().sort().forEach((nombre) => print(`  - ${nombre}`));
