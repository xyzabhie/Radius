import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./App.css";



import { Buffer } from "buffer";

// Polyfill for Node.js globals in browser
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
  // Ensure process.versions.node exists to prevent crashes in libraries checking for Node.js
  // @ts-ignore
  if (!window.process) window.process = { env: {}, versions: { node: '18.16.0' } };
  // @ts-ignore
  if (!window.process.versions) window.process.versions = { node: '18.16.0' };
  // @ts-ignore
  if (!window.process.versions.node) window.process.versions.node = '18.16.0';
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
