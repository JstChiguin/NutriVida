package cl.nutrivida.clinico.modelo;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "servicios")
public record ServicioNutricional(
        @Id String id,
        @Indexed(unique = true) String nombre,
        String descripcion,
        @Indexed String categoria,
        int duracionMinutos,
        int precioReferencial,
        boolean activo,
        Instant creadoEn,
        Instant actualizadoEn,
        @Version Long version) {

    public ServicioNutricional conDatos(String nuevoNombre, String nuevaDescripcion, String nuevaCategoria,
                                        int nuevaDuracion, int nuevoPrecio) {
        return new ServicioNutricional(id, nuevoNombre, nuevaDescripcion, nuevaCategoria, nuevaDuracion, nuevoPrecio,
                activo, creadoEn, Instant.now(), version);
    }

    public ServicioNutricional conEstado(boolean nuevoEstado) {
        return new ServicioNutricional(id, nombre, descripcion, categoria, duracionMinutos, precioReferencial,
                nuevoEstado, creadoEn, Instant.now(), version);
    }
}
