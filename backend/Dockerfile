FROM maven:3.9-eclipse-temurin-21 AS construccion
WORKDIR /aplicacion
COPY pom.xml .
COPY comun comun
COPY servicio-autenticacion servicio-autenticacion
COPY servicio-clinico servicio-clinico
COPY servicio-agenda servicio-agenda
ARG SERVICIO
RUN mvn -q -B -DskipTests -pl ${SERVICIO} -am package

FROM eclipse-temurin:21-jre
ARG SERVICIO
WORKDIR /aplicacion
COPY --from=construccion /aplicacion/${SERVICIO}/target/nutrivida-${SERVICIO}-1.0.0.jar aplicacion.jar
RUN useradd --system --no-create-home nutrivida
USER nutrivida
ENTRYPOINT ["java", "-jar", "aplicacion.jar"]
