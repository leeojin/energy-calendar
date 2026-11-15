# 에너지 캘린더

컨디션에 따라 하루에 할 수 있는 일이 달라진다는 점에서 시작한 캘린더입니다.

할 일을 오전·오후·저녁으로 나누고, 필요한 에너지를 칸으로 표시합니다.
그날의 컨디션을 바꾸면 쓸 수 있는 에너지도 달라져 계획을 조절할 수 있습니다.

매주 하는 일은 반복 일정으로 등록하고, 미룬 일은 다른 날로 옮길 수 있습니다.
친구에게 보여줄 일정만 골라 공유하거나 짧은 응원을 받을 수도 있습니다.

## 사용 기술

- React · TypeScript · Vite
- Kotlin · Spring Boot · JPA · MySQL
- Docker Compose · Caddy

## 실행 방법

Docker와 Docker Compose가 필요합니다.

```bash
cp .env.example .env
```

`.env` 파일 안의 안내에 따라 값을 설정합니다.

```bash
docker compose up --build -d
```

브라우저에서 http://localhost:8000 으로 접속합니다.
종료는 `docker compose down`.
