# ---------- Runtime stage (pre-built JAR) ----------
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/identity-service-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
