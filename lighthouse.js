const lighthouse = require("lighthouse");

/**
 * Function get performance audits for a website using lighthouse
 * @param {string} url url of website to test
 * @param {object} headers additional headers to pass on e.g. Authorization, Cookie, etc
 * @returns audits provided by lighthouse corresponding to the url, headers pair
 */
const getAudits = async (url, headers, formactor, chromePort) => {
  // Configurations for lighthhouse
  const options = {
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
    // Port of chrome instance we want to run lighthhouse on
    port: chromePort,
    // Headers to pass on e.g. Authorization, Cookie, etc
    extraHeaders: headers,
    formactor,
  };

  try {
    const runnerResult = await lighthouse(url, options);
    // Extract audits from lighthouse result
    const audits = runnerResult.lhr.audits;
    return audits;
  } catch (err) {
    console.error(err);
    return {};
  }
};

module.exports = {
  getAudits: getAudits,
};
