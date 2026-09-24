import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ToastProvider } from "./components/common/ToastContext";
import { ConfirmProvider } from "./components/common/ConfirmContext";
import { PWAInstallPrompt } from "./components/common/PWAInstallPrompt";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
        <PWAInstallPrompt />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
