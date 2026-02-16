# Verification Plan: Auth & Body Features

Use `https://httpbin.org` for reliable echo testing. it returns exactly what you sent, making debugging easy.

## 1. Authentication Testing

### A. Bearer Token
- [ ] **Setup**: Select "Bearer Token". Enter `my-secret-token`.
- [ ] **Action**: Send GET to `https://httpbin.org/bearer`.
- [ ] **Verify**: Response body should contain `"authenticated": true` and `"token": "my-secret-token"`.
- [ ] **Edge Case**: Empty token. Should send empty header `Authorization: Bearer `.

### B. Basic Auth
- [ ] **Setup**: Select "Basic Auth". User: `user`, Pass: `passwd`.
- [ ] **Action**: Send GET to `https://httpbin.org/basic-auth/user/passwd`.
- [ ] **Verify**: Status `200 OK`. response `"authenticated": true`.
- [ ] **Edge Case**: Special characters in password (e.g., `p@ss:w0rd`). Should be correctly base64 encoded.

### C. API Key
- [ ] **Header Mode**: Key `X-Custom-Key`, Value `12345`, Placement `Header`.
    - Send GET to `https://httpbin.org/headers`.
    - Verify `"X-Custom-Key": "12345"` is present.
- [ ] **Query Mode**: Key `api_key`, Value `12345`, Placement `Query Params`.
    - Send GET to `https://httpbin.org/get`.
    - Verify `args` contains `"api_key": "12345"`.

## 2. Body Data Testing

### A. x-www-form-urlencoded
- [ ] **Setup**: Select "x-www-form-urlencoded". Add `foo` = `bar`, `space` = `hello world`.
- [ ] **Action**: Send POST to `https://httpbin.org/post`.
- [ ] **Verify**: `form` field contains data. check `space` value is NOT `hello%20world` (it should be decoded in the response view, but encoded on wire).
- [ ] **Edge Case**: Keys with symbols `user[name]`, value `a&b`. Should not break parsing.

### B. Multipart Form-Data
- [ ] **Setup**: Select "form-data". Add `username` = `admin`.
- [ ] **Action**: Send POST to `https://httpbin.org/post`.
- [ ] **Verify**: `headers["Content-Type"]` starts with `multipart/form-data; boundary=...`.
- [ ] **Verify**: `form` contains `username`.

## 3. Persistence & State
- [ ] **Switching Tabs**: Set specific Auth in Tab A. Switch to Tab B. Switch back. Data should be preserved.
- [ ] **Saving**: Press `Ctrl+S`. Close app. Reopen.
    - Check if `.rd` file on disk contains the `auth` block.
    - Check if GUI loads the Auth settings correctly.
