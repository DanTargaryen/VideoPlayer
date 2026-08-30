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

## Phased Gateway cutover

`GATEWAY_ROUTE_MODE=services` no longer sends an entire path prefix to a service blindly. The Gateway first checks an explicit implemented-route capability map and then applies two allowlists:

- `GATEWAY_READ_CUTOVER` defaults to `identity-community,content-media`.
- `GATEWAY_WRITE_CUTOVER` defaults to an empty list.
- Both variables accept comma-separated service names, `all`, or `none`.

This makes the first services-mode deployment a read-only identity/content cutover. Unsupported paths such as `/api/v1/feed/sidebar/live`, `/api/v1/search/suggest`, and `/api/v1/videos/:id/comments` remain on the monolith instead of returning a service 404. Write domains are enabled only after their migration and regression Gate. The standard Compose smoke sets both allowlists to `all` because it intentionally exercises the already implemented UC05/UC06 service writes in an isolated environment.
