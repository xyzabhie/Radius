meta:
  name: "Step 1: Get Token"
  type: REST
  version: 1
request:
  method: POST
  url: "https://httpbin.org/post"
  body:
    format: json
    content:
      token: "radius_session_12345"
scripts:
  post: |
    const data = response.json();
    radius.setVariable('authToken', data.json.token);
    radius.log("Token captured:", data.json.token);