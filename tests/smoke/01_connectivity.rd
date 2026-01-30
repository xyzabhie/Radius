meta:
  name: "Smoke - Connectivity"
  type: REST
  version: 1
request:
  method: GET
  url: "https://httpbin.org/get"
scripts:
  post: |
    radius.expect(response.status).toBe(200);
    radius.log("Cloud connectivity verified.");
