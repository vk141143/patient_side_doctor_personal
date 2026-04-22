import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, requestNotificationPermission } from "./lib/notifications";

// Register SW + request notification permission
window.addEventListener("load", async () => {
  await registerServiceWorker();
  await requestNotificationPermission();
});

createRoot(document.getElementById("root")!).render(<App />);
