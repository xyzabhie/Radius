# GraphQL query to fetch users with pagination
meta:
  name: "Get Users (GraphQL)"
  type: GraphQL
  version: 1

request:
  method: POST
  url: "{{baseUrl}}/graphql"

  headers:
    Content-Type: "application/json"

  body:
    format: graphql
    query: |
      query GetUsers($limit: Int!, $offset: Int) {
        users(limit: $limit, offset: $offset) {
          id
          username
          email
          createdAt
          profile {
            firstName
            lastName
            avatar
          }
        }
        totalUsers
      }
    variables:
      limit: 10
      offset: 0

auth:
  type: bearer
  token: "{{env.GQL_TOKEN}}"

scripts:
  post: |
    // Process and log the user data
    if (response.status === 200) {
      const data = response.json().data;
      console.log("Fetched", data.users.length, "of", data.totalUsers, "users");
      radius.setVariable("userList", data.users);
    }
