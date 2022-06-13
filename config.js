// Deafault configuration for every device
const DEFAULT_CONFIG = {
  // Desired log type
  logLevel: "info",
  // Desired audits from lighthouse
  onlyAudits: [
    "resource-summary",
    "mainthread-work-breakdown",
    "bootup-time",
    "third-party-summary",
    "network-requests",
    "network-rtt",
    "network-server-latency",
  ],
  // Maximum wait time in ms for first contentful paint
  maxWaitForFcp: 15 * 1000,
  // Maximum wait time in ms for or page load
  maxWaitForLoad: 35 * 1000,
};

// Additional configuration for desktop devices
const DESKTOP_CONFIG = {
  // Type of device
  formFactor: "desktop",
  // Emulated screen configurations
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
  // Network Throttling configuration
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0, // 0 means unset
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
  },
  // Browser configuration
  emulatedUserAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4695.0 Safari/537.36 Chrome-Lighthouse",
};

/**
 * Return options for lighthouse according to given params
 * @param {String} deviceType Type of device
 * @param {Object} headers Headers to add in configuration
 * @param {Number} chromePort Port of chrom on which lighthouse will run
 * @returns Options
 */
function getOptions(deviceType, headers, chromePort) {
  return deviceType === "mobile"
    ? { ...DEFAULT_CONFIG, extraHeaders: headers, port: chromePort }
    : {
        ...DEFAULT_CONFIG,
        ...DESKTOP_CONFIG,
        extraHeaders: headers,
        port: chromePort,
      };
}

module.exports = {
  getOptions,
};
