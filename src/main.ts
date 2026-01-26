import { App } from "./App";

// Application Entry Point
const initializeApp = () => {
  console.log("App Initializing...");
  const app = new App();
  app.init();
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
