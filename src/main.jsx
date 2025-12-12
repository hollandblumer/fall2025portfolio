import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./styles/index.scss";
import ReactGA from "react-ga4";

const MEASUREMENT_ID = "G-Z4ZB8VFFWL";
ReactGA.initialize(MEASUREMENT_ID);

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
