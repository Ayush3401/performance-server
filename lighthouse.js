const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");

const getAudits = async (url, headers) => {
  const options = {
    logLevel: 'info',
    onlyAudits: [
      "resource-summary",
      "mainthread-work-breakdown",
      "bootup-time",
      "third-party-summary",
      "network-requests",
      "network-rtt",
      "network-server-latency",
    ],
    port: 12345,
    extraHeaders: headers,
  };
  try {
    const runnerResult = await lighthouse(url, options);
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
