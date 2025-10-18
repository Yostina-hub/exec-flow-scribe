import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/registerServiceWorker";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker only in production and clean up in dev
registerServiceWorker();
