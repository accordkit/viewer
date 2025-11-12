import React from "react";
import ReactDOM from "react-dom/client";
import "@xyflow/react/dist/style.css";

import App from "./App";
import "./styles.css";
import { PluginProvider } from "./plugins";
import { LatencyBarPlugin } from "./plugins/LatencyBarPlugin";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PluginProvider slots={{ EventExtras: LatencyBarPlugin }}>
      <App />
    </PluginProvider>
  </React.StrictMode>
);
