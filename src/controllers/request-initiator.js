const Audit = require("lighthouse/lighthouse-core/audits/audit");
const NetworkRecords = require("lighthouse/lighthouse-core/computed/network-records.js");

/**
 * @param {Object} initiator Data for initiator
 * @returns Simplified initiator object with initiator url | urls
 */
function getSimplifiedInitiator(initiator) {
  let simplifiedInitiator;

  if (initiator.type === "parser") {
    simplifiedInitiator = {
      type: "parser",
      url: initiator.url,
    };
  } else if (initiator.type === "script") {
    simplifiedInitiator = {
      type: "script",
      // Fetch requests from stack frame
      urls: [
        ...new Set(
          initiator.stack.callFrames
            .map((frame) => frame.url)
            .filter((v) => Boolean(v))
        ),
      ],
    };
  } else {
    simplifiedInitiator = initiator;
  }

  return simplifiedInitiator;
}

/**
 * @param {Object} artifacts LH.Artifacts
 * @param {Object} context LH.Context
 * @returns Array with elements as edges between url and initiator
 */
async function getInitiators(artifacts, context) {
  const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
  const networkRecords = await NetworkRecords.request(devtoolsLog, context);
  const requestInitiator = new Set();

  for (const request of networkRecords) {
    const url = request.url;
    const initiator = request.initiator;
    const simplifiedInitiator = getSimplifiedInitiator(initiator);

    if (simplifiedInitiator.url) {
      requestInitiator.add({
        url,
        initiator: simplifiedInitiator.url,
      });
    } else if (
      simplifiedInitiator.urls &&
      simplifiedInitiator.urls.length > 0
    ) {
      requestInitiator.add({
        url,
        // Last url in stack frame is the actual initiator
        initiator: simplifiedInitiator.urls[0],
      });
    }
  }

  return [...requestInitiator];
}

module.exports = {
  getInitiators,
};
