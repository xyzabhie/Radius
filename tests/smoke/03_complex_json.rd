meta:
  name: "Smoke - Data Flow"
  type: REST
  version: 1
request:
  method: POST
  url: "https://httpbin.org/post"
  body:
    format: json
    content:
      test: "radius-v1"
      timestamp: "{{$timestamp}}"
scripts:
  post: |
    const data = response.json();
    radius.expect(data.json.test).toBe("radius-v1");
    radius.log("JSON Body Round-trip verified.");
