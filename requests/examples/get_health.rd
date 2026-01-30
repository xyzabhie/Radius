# Simple health check endpoint
meta:
  name: "Health Check"
  type: REST
  version: 1

request:
  method: GET
  url: "{{baseUrl}}/health"

auth:
  type: none
