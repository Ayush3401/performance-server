const Audit = require("lighthouse/lighthouse-core/audits/audit");
const NetworkRecords = require("lighthouse/lighthouse-core/computed/network-records.js");

async function getInitiators(artifacts,context){
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const requestInitiator = new Set()
    for (const request of networkRecords) {
        const url = request.url;
      const initiator = request.initiator;
      let simplifiedInitiator;
      if (initiator.type === "parser") {
        simplifiedInitiator = {
          type: "parser",
          url: initiator.url,
        };
      } else if (initiator.type === "script") {
        simplifiedInitiator = {
          type: "script",
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
          initiator: simplifiedInitiator.urls[0],
        });
      }
    }
    return [...requestInitiator]
}

module.exports = {
    getInitiators
}