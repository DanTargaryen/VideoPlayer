# gateway

MS-00 compatibility gateway. `GATEWAY_ROUTE_MODE=monolith` is the default, so all business traffic remains on the monolith. Later tasks may switch frozen path groups to services while retaining GET/HEAD fallback.

Environment variables:

- `PORT` (default `3100`)
- `GATEWAY_ROUTE_MODE` (`monolith` or `services`)
- `MONOLITH_BASE_URL`
- `IDENTITY_SERVICE_URL`
- `CONTENT_SERVICE_URL`
- `LIVE_SERVICE_URL`
- `GOVERNANCE_SERVICE_URL`
- `GATEWAY_MONOLITH_FALLBACK`
- `GATEWAY_UPSTREAM_TIMEOUT_MS`
