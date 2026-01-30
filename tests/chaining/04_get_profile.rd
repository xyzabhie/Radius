meta:
  name: "Step 2: Use Token"
  type: REST
  version: 1
request:
  method: GET
  url: "https://httpbin.org/headers"
  headers:
    Authorization: "Bearer {{authToken}}"
scripts:
  post: |
    radius.expect(response.status).toBe(200);
    radius.log("Authorization header verified with captured token.");