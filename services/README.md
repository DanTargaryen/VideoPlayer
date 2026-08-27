# VideoPlayer microservice scaffold

MS-00 provides shared health/version contracts, service JWT primitives, five independently buildable runtimes, a monolith-first Gateway, Docker/Compose and Kubernetes/Jenkins integration.

No business route, database model or traffic cutover is implemented here. MS-01 through MS-04 own their schemas and business behavior after this scaffold merges.

## Local quality gate

```bash
npm run test:services:ci
```

## Local Compose smoke

```bash
MICROSERVICE_COMPOSE_PROJECT_NAME=video-player-ms00-local \
  bash scripts/compose-microservices-smoke.sh
```

Ports are `3100` for the Gateway and `3101` through `3104` for the four business-service health endpoints. The Gateway defaults to `GATEWAY_ROUTE_MODE=monolith`, so MS-00 does not switch production traffic.
