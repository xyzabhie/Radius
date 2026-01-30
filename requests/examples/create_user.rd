# Create a new user account
meta:
  name: "Create User"
  type: REST
  version: 1

request:
  method: POST
  url: "{{baseUrl}}/api/v1/users"

  headers:
    Content-Type: "application/json"
    X-Request-ID: "{{$uuid}}"

  body:
    format: json
    content:
      username: "johndoe"
      email: "john.doe@example.com"
      role: "user"

auth:
  type: bearer
  token: "{{env.ACCESS_TOKEN}}"

scripts:
  pre: |
    // Generate a unique request ID
    const requestId = radius.uuid();
    radius.setVariable("$uuid", requestId);
    console.log("Creating user with request:", requestId);

  post: |
    // Store the created user ID for subsequent requests
    if (response.status === 201) {
      const userId = response.json().id;
      radius.setVariable("createdUserId", userId);
      console.log("User created with ID:", userId);
    } else {
      console.error("Failed to create user:", response.status);
    }
