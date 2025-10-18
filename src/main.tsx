import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/registerServiceWorker";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline support
registerServiceWorker();
