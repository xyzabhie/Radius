meta:
  name: "Smoke - Variables"
  type: REST
  version: 1
request:
  method: GET
  url: "{{smokeUrl}}/status/200"
scripts:
  pre: |
    // If smokeUrl isn't set in .env, we set a fallback here
    if (!radius.getVariable("smokeUrl")) {
      radius.setVariable("smokeUrl", "https://httpbin.org");
    }
  post: |
    radius.expect(response.status).toBe(200);
