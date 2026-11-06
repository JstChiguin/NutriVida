package cl.nutrivida.clinico;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GestionClinicaIntegracionPruebas extends BaseIntegracionClinica {

    @BeforeEach
    void autorizarNutricionistaAna() {
        autorizar(nutricionistaAna, pacientePedro);
    }

    private Map<String, Object> datosFicha(String motivo) {
        return Map.of("motivoConsulta", motivo, "alergias", List.of("Maní"), "habitosAlimentarios", "Come fuera de casa",
                "actividadFisica", Map.of("nivel", "LIGERO", "descripcion", "Caminatas", "sesionesPorSemana", 3),
                "objetivosNutricionales", List.of("Reducir peso"));
    }

    private String abrirFicha() throws Exception {
        return leer(ejecutar(post("/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica"), nutricionistaAna,
                datosFicha("Control de peso")).andExpect(status().isCreated())).get("id").asText();
    }

    @Test
    void soloUnNutricionistaAutorizadoAbreLaFichaYSoloUnaVez() throws Exception {
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica";

        ejecutar(post(ruta), nutricionistaBruno, datosFicha("No autorizado")).andExpect(status().isForbidden());
        ejecutar(post(ruta), pacientePedro, datosFicha("Paciente")).andExpect(status().isForbidden());
        ejecutar(post(ruta), administrador, datosFicha("Admin")).andExpect(status().isForbidden());
        abrirFicha();
        ejecutar(post(ruta), nutricionistaAna, datosFicha("Duplicada")).andExpect(status().isConflict());
    }

    @Test
    void protegeLaFichaContraAccesoHorizontal() throws Exception {
        abrirFicha();
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica";

        ejecutar(get(ruta), pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.motivoConsulta").value("Control de peso"));
        ejecutar(get(ruta), nutricionistaAna, null).andExpect(status().isOk());
        ejecutar(get(ruta), pacientePaula, null).andExpect(status().isForbidden());
        ejecutar(get(ruta), nutricionistaBruno, null).andExpect(status().isForbidden());
        ejecutar(get(ruta), administrador, null).andExpect(status().isForbidden());
        ejecutar(get(ruta), null, null).andExpect(status().isUnauthorized());
    }

    @Test
    void registraEvolucionesSinSobrescribirLasAnterioresYCorrigeConHistorial() throws Exception {
        abrirFicha();
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica";

        ejecutar(post(ruta + "/evoluciones"), nutricionistaAna, Map.of("descripcion", "Primera sesión"))
                .andExpect(status().isCreated());
        JsonNode ficha = leer(ejecutar(post(ruta + "/evoluciones"), nutricionistaAna,
                Map.of("descripcion", "Segunda sesión")).andExpect(status().isCreated()));
        assertThat(ficha.get("evoluciones")).hasSize(2);
        String primeraId = ficha.get("evoluciones").get(0).get("identificador").asText();

        JsonNode corregida = leer(ejecutar(post(ruta + "/evoluciones/" + primeraId + "/correcciones"), nutricionistaAna,
                Map.of("descripcion", "Primera sesión (texto corregido)", "motivoCorreccion", "Error de digitación"))
                .andExpect(status().isCreated()));

        assertThat(corregida.get("evoluciones")).hasSize(3);
        assertThat(corregida.get("evoluciones").get(0).get("descripcion").asText()).isEqualTo("Primera sesión");
        assertThat(corregida.get("evoluciones").get(0).get("corregida").asBoolean()).isTrue();
        assertThat(corregida.get("evoluciones").get(2).get("corrigeEvolucionId").asText()).isEqualTo(primeraId);
        ejecutar(post(ruta + "/evoluciones/" + primeraId + "/correcciones"), nutricionistaAna,
                Map.of("descripcion", "Otra", "motivoCorreccion", "Repetida")).andExpect(status().isConflict());
    }

    @Test
    void soloElAutorDeUnaEvolucionPuedeCorregirla() throws Exception {
        abrirFicha();
        autorizar(nutricionistaBruno, pacientePedro);
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica";
        String evolucionId = leer(ejecutar(post(ruta + "/evoluciones"), nutricionistaAna,
                Map.of("descripcion", "Sesión de Ana")).andExpect(status().isCreated()))
                .get("evoluciones").get(0).get("identificador").asText();

        ejecutar(post(ruta + "/evoluciones/" + evolucionId + "/correcciones"), nutricionistaBruno,
                Map.of("descripcion", "Reescrita por otro", "motivoCorreccion", "Intento")).andExpect(status().isForbidden());
    }

    @Test
    void actualizarLaFichaConservaElEstadoAnteriorYExigeMotivo() throws Exception {
        abrirFicha();
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica";

        ejecutar(put(ruta), nutricionistaAna, Map.of("datos", datosFicha("Nuevo motivo"))).andExpect(status().isBadRequest());
        JsonNode actualizada = leer(ejecutar(put(ruta), nutricionistaAna,
                Map.of("datos", datosFicha("Nuevo motivo"), "motivoCambio", "Se precisó el motivo"))
                .andExpect(status().isOk()));

        assertThat(actualizada.get("motivoConsulta").asText()).isEqualTo("Nuevo motivo");
        assertThat(actualizada.get("correcciones")).hasSize(1);
        assertThat(actualizada.get("correcciones").get(0).get("valorAnterior").asText()).contains("Control de peso");
    }

    @Test
    void unaFichaCerradaNoAceptaNuevasEvoluciones() throws Exception {
        abrirFicha();
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/ficha-clinica";

        ejecutar(patch(ruta + "/estado?estado=CERRADA"), nutricionistaAna, null).andExpect(status().isOk());
        ejecutar(post(ruta + "/evoluciones"), nutricionistaAna, Map.of("descripcion", "Tarde")).andExpect(status().isConflict());
    }

    @Test
    void calculaElImcYEntregaLaEvolucionParaGraficos() throws Exception {
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/mediciones";

        JsonNode primera = leer(ejecutar(post(ruta), nutricionistaAna, Map.of("pesoKg", 80.0, "estaturaCm", 170.0,
                "cinturaCm", 95.0, "fecha", "2026-01-10T12:00:00Z")).andExpect(status().isCreated()));
        assertThat(primera.get("imc").asDouble()).isEqualTo(27.7);
        ejecutar(post(ruta), nutricionistaAna, Map.of("pesoKg", 76.5, "fecha", "2026-02-10T12:00:00Z"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.estaturaCm").value(170.0))
                .andExpect(jsonPath("$.imc").value(26.5));

        ejecutar(get(ruta + "/evolucion"), pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.puntos.length()").value(2))
                .andExpect(jsonPath("$.puntos[0].pesoKg").value(80.0))
                .andExpect(jsonPath("$.resumen.variacionPesoKg").value(-3.5));
        ejecutar(get(ruta), nutricionistaAna, null).andExpect(jsonPath("$.totalElementos").value(2));
    }

    @Test
    void validaRangosFechasYEstaturaInicialDeLasMediciones() throws Exception {
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/mediciones";

        ejecutar(post(ruta), nutricionistaAna, Map.of("pesoKg", 900.0, "estaturaCm", 170.0)).andExpect(status().isBadRequest());
        ejecutar(post(ruta), nutricionistaAna, Map.of("pesoKg", 70.0)).andExpect(status().isBadRequest());
        ejecutar(post(ruta), nutricionistaAna, Map.of("pesoKg", 70.0, "estaturaCm", 170.0, "fecha", "2099-01-01T00:00:00Z"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void protegeLasMedicionesDeOtrosPacientes() throws Exception {
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/mediciones";

        ejecutar(post(ruta), nutricionistaBruno, Map.of("pesoKg", 70.0, "estaturaCm", 170.0)).andExpect(status().isForbidden());
        ejecutar(post(ruta), pacientePedro, Map.of("pesoKg", 70.0, "estaturaCm", 170.0)).andExpect(status().isForbidden());
        ejecutar(get(ruta + "/evolucion"), pacientePaula, null).andExpect(status().isForbidden());
    }

    @Test
    void anularUnaMedicionLaExcluyeDeLaEvolucionSinEliminarla() throws Exception {
        String ruta = "/api/pacientes/" + pacientePedro.perfilId() + "/mediciones";
        String medicionId = leer(ejecutar(post(ruta), nutricionistaAna, Map.of("pesoKg", 70.0, "estaturaCm", 170.0))
                .andExpect(status().isCreated())).get("id").asText();

        ejecutar(patch(ruta + "/" + medicionId + "/anulacion"), nutricionistaAna, Map.of("motivo", "Peso mal digitado"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ANULADA"));
        ejecutar(get(ruta + "/evolucion"), nutricionistaAna, null).andExpect(jsonPath("$.puntos.length()").value(0));
        ejecutar(patch(ruta + "/" + medicionId + "/anulacion"), nutricionistaAna, Map.of("motivo", "Otra vez"))
                .andExpect(status().isConflict());
        assertThat(plantillaMongo.getCollection("mediciones").countDocuments()).isEqualTo(1);
    }

    private Map<String, Object> datosPlan(String objetivo) {
        return Map.of("objetivos", List.of(objetivo), "comidas", List.of(Map.of("nombre", "Desayuno", "horario", "08:00",
                "alimentos", List.of(Map.of("alimento", "Avena", "cantidad", 40.0, "unidad", "g")))),
                "recomendacionesGenerales", "Hidratación constante");
    }

    @Test
    void versionaLosPlanesAlimentariosManteniendoSoloUnoVigente() throws Exception {
        String base = "/api/pacientes/" + pacientePedro.perfilId() + "/planes-alimentarios";

        String planId = leer(ejecutar(post(base), nutricionistaAna, datosPlan("Bajar de peso"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.numeroVersion").value(1))).get("id").asText();
        ejecutar(post(base), nutricionistaAna, datosPlan("Duplicado")).andExpect(status().isConflict());

        ejecutar(put("/api/planes-alimentarios/" + planId), nutricionistaAna, datosPlan("Mantener peso"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.numeroVersion").value(2))
                .andExpect(jsonPath("$.planAnteriorId").value(planId));

        ejecutar(get(base + "/vigente"), pacientePedro, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.objetivos[0]").value("Mantener peso"));
        ejecutar(get(base), nutricionistaAna, null).andExpect(jsonPath("$.totalElementos").value(2));
        ejecutar(get("/api/planes-alimentarios/" + planId), pacientePedro, null)
                .andExpect(jsonPath("$.estado").value("REEMPLAZADO"));
        ejecutar(put("/api/planes-alimentarios/" + planId), nutricionistaAna, datosPlan("Sobre versión vieja"))
                .andExpect(status().isConflict());
    }

    @Test
    void protegeLosPlanesAlimentariosYPermiteFinalizarlos() throws Exception {
        String base = "/api/pacientes/" + pacientePedro.perfilId() + "/planes-alimentarios";
        String planId = leer(ejecutar(post(base), nutricionistaAna, datosPlan("Bajar de peso"))
                .andExpect(status().isCreated())).get("id").asText();

        ejecutar(get("/api/planes-alimentarios/" + planId), pacientePaula, null).andExpect(status().isForbidden());
        ejecutar(put("/api/planes-alimentarios/" + planId), nutricionistaBruno, datosPlan("Intruso"))
                .andExpect(status().isForbidden());
        ejecutar(patch("/api/planes-alimentarios/" + planId + "/finalizacion"), nutricionistaAna, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("FINALIZADO"));
        ejecutar(get(base + "/vigente"), pacientePedro, null).andExpect(status().isNotFound());
    }

    @Test
    void rechazaPlanesConVigenciaInvertida() throws Exception {
        Map<String, Object> plan = Map.of("objetivos", List.of("Objetivo"), "comidas", List.of(Map.of("nombre", "Cena",
                "alimentos", List.of())), "vigenteDesde", "2026-05-10", "vigenteHasta", "2026-05-01");

        ejecutar(post("/api/pacientes/" + pacientePedro.perfilId() + "/planes-alimentarios"), nutricionistaAna, plan)
                .andExpect(status().isBadRequest());
    }
}
