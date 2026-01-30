# Local Development Environment
# This file demonstrates environment profiles with secret masking.

name: "Local Development"

baseUrl: "https://httpbin.org"

variables:
  apiUrl: "https://httpbin.org"
  apiVersion: "v1"
  apiKey: "sk-local-dev-key-12345"
  debugMode: "true"

# Variables listed here will be masked in terminal output
secrets:
  - apiKey
