package cl.nutrivida.clinico.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "solicitudes_contacto")
public record SolicitudContacto(
        @Id String id,
        String nombre,
        String correo,
        String telefono,
        String mensaje,
        @Indexed EstadoSolicitud estado,
        @Indexed(unique = true) String claveDuplicado,
        Instant creadoEn,
        Instant actualizadoEn) {

    public enum EstadoSolicitud {
        PENDIENTE,
        EN_REVISION,
        RESUELTA
    }

    public SolicitudContacto conEstado(EstadoSolicitud nuevoEstado) {
        return new SolicitudContacto(id, nombre, correo, telefono, mensaje, nuevoEstado, claveDuplicado, creadoEn,
                Instant.now());
    }
}
