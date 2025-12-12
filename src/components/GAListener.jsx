// GAListener.jsx (The correct structure)

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

// REMOVE these two lines:
// const MEASUREMENT_ID = "G-Z4ZB8VFFWL";
// ReactGA.initialize(MEASUREMENT_ID);

export default function GAListener({ children }) {
  // useLocation gives you the current location object
  const location = useLocation();

  useEffect(() => {
    // 2. Track the page view on component mount and every location change
    const path = location.pathname + location.search;

    console.log("Tracking page view:", path); // Optional: Check your console

    // This will send the page view data.
    ReactGA.send({
      hitType: "pageview",
      page: path,
      title: document.title,
    });
  }, [location]); // The effect runs whenever the 'location' object changes

  return children;
}
