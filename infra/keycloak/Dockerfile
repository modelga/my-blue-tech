FROM quay.io/keycloak/keycloak:26.2

# Keycloak 26+ exposes /health/ready on the management port (9000).
# No extra tools needed — the healthcheck in docker-compose uses bash /dev/tcp.
