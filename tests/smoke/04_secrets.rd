meta:
  name: "Secret Masking Test"
  type: REST
  version: 1
request:
  method: GET
  url: "{{apiUrl}}/get"
  headers:
    X-Api-Key: "{{apiKey}}"
scripts:
  post: |
    radius.log("API Key used:", radius.getEnv("apiKey") || "from-env");
    radius.log("Request successful with masked credentials");
    radius.expect(response.status).toBe(200);
