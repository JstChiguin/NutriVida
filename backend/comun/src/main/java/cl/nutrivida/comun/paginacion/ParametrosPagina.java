package cl.nutrivida.comun.paginacion;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class ParametrosPagina {

    private static final int TAMANO_MAXIMO = 100;

    private ParametrosPagina() {
    }

    public static Pageable crear(int pagina, int tamano, String campoOrden, boolean descendente) {
        int paginaSegura = Math.max(pagina, 0);
        int tamanoSeguro = Math.min(Math.max(tamano, 1), TAMANO_MAXIMO);
        Sort orden = descendente ? Sort.by(campoOrden).descending() : Sort.by(campoOrden).ascending();
        return PageRequest.of(paginaSegura, tamanoSeguro, orden);
    }
}
