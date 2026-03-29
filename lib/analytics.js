import axios from "axios";

/**
 * Standard Analytics Hook for BigQuery Clickstream tracking
 * This securely proxies frontend UI events through our Next.js API
 * into Avanti's Google Cloud reporting platform.
 */

export const trackEvent = async (eventName, eventData = {}) => {
  try {
    const payload = {
      event: eventName,
      properties: eventData,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "server",
    };

    // Proxies to our secure backend API rather than exposing Bigquery keys to the browser
    if (typeof window !== "undefined") {
      axios.post("/api/telemetry", payload).catch(e => {
        // Silently catch network drops to not impact user experience
        console.debug("Telemetry dropped sync:", e.message);
      });
    } else {
      console.log("[Analytics - Server Mode] Tracked:", payload);
    }
  } catch (error) {
    console.warn("Failed to fire analytics event", error);
  }
};