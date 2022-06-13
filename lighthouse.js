const lighthouse = require("lighthouse");
const config = require("./config")
/**
 * Function get performance audits for a website using lighthouse
 * @param {string} url url of website to test
 * @param {object} headers additional headers to pass on e.g. Authorization, Cookie, etc
 * @returns audits provided by lighthouse corresponding to the url, headers pair
 */
const getAudits = async (url, headers, formFactor, chromePort) => {
  // Configurations for lighthhouse
  let options = config.getOptions(formFactor, headers, chromePort)
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
