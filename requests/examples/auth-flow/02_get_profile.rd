meta:
  name: "Auth Flow - Get Profile Example"
  type: REST
  version: 1

request:
  method: GET
  url: "{{baseUrl}}/get"
  headers:
    Authorization: "Bearer {{authToken}}"

scripts:
  post: |
    const data = response.json();
    radius.log("Profile request completed with Authorization header");
    radius.expect(response.status).toBe(200);
    radius.expect(data.headers.Authorization).toBe("Bearer simulated-token-12345");
