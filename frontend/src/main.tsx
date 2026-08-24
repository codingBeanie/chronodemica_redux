import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/charts/styles.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n/I18nProvider";
import { theme } from "./theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <I18nProvider locale="en">
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </MantineProvider>
  </StrictMode>,
);
