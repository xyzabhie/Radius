meta:
  name: "Auth Flow - Login API Example"
  type: REST
  version: 1

request:
  method: POST
  url: "{{baseUrl}}/post"
  headers:
    Content-Type: "application/json"
  body:
    format: json
    content:
      username: "testuser"
      password: "password123"

scripts:
  post: |
    const data = response.json();
    // Simulate receiving a token from the login API response
    radius.setVariable("authToken", "simulated-token-12345");
    radius.log("Login simulation complete, authToken injected into session");
    radius.expect(response.status).toBe(200);
