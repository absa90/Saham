import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Save the clean original HTML BEFORE React renders (for download feature)
(window as any).__ORIGINAL_HTML__ = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
