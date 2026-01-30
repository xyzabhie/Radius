meta:
  name: "Chain A - Set Variable"
  type: REST
  version: 1
request:
  method: GET
  url: "https://httpbin.org/uuid"
scripts:
  post: |
    const data = response.json();
    radius.setVariable("chainedUuid", data.uuid);
    radius.log("Request A: Generated UUID:", data.uuid);
    radius.expect(response.status).toBe(200);
