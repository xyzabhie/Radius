meta:
  name: "Chain B - Use Variable"
  type: REST
  version: 1
request:
  method: POST
  url: "https://httpbin.org/post"
  body:
    format: json
    content:
      previousUuid: "{{chainedUuid}}"
      message: "This UUID came from the previous request"
scripts:
  post: |
    const data = response.json();
    radius.log("Request B: Received UUID from A:", data.json.previousUuid);
    radius.expect(data.json.previousUuid).toBeDefined();
    radius.expect(response.status).toBe(200);
