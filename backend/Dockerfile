
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /build


COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn package -DskipTests -q


FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app


RUN touch /.env

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
