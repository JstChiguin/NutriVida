package cl.nutrivida.comun.paginacion;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

public record PaginaRespuesta<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas) {

    public static <E, T> PaginaRespuesta<T> de(Page<E> pagina, Function<E, T> conversor) {
        return new PaginaRespuesta<>(
                pagina.getContent().stream().map(conversor).toList(),
                pagina.getNumber(),
                pagina.getSize(),
                pagina.getTotalElements(),
                pagina.getTotalPages());
    }
}
