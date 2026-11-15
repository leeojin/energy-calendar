# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM eclipse-temurin:17-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts .editorconfig ./
COPY gradle ./gradle
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:17-jre
ENV TZ=Asia/Seoul
COPY --from=build /src/build/libs/*.jar /app/app.jar
ENTRYPOINT ["java","-Duser.timezone=Asia/Seoul","-Xmx384m","-jar","/app/app.jar"]
