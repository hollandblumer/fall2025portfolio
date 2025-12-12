import ReactGA from "react-ga4";

export function trackEvent(name, params = {}) {
  ReactGA.event(name, {
    category: "engagement",
    ...params,
  });
}
