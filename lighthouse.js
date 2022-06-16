const lighthouse = require("audit-tool/lighthouse-core/fraggle-rock/api.js");
const config = require("./config");
/**
 * Function get performance audits for a website using lighthouse
 * @param {string} url url of website to test
 * @param {object} headers additional headers to pass on e.g. Authorization, Cookie, etc
 * @returns audits provided by lighthouse corresponding to the url, headers pair
 */
const getAudits = async (url, headers, formFactor, browser, waitTime) => {
  // Configurations for lighthhouse
  try {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setDefaultNavigationTimeout(0); 
    let options = config.getOptions(formFactor, headers);
    const flow = await lighthouse.startFlow(page, {
      configContext: {
        settingsOverrides: options,
      },
    });
    await flow.startTimespan();
    await page.goto(url);
    console.log(waitTime)
    await new Promise((r) =>
      setTimeout(r, waitTime ? Math.min(60000, waitTime) : 60000)
    );
    await flow.endTimespan();
    await page.close()
    let report = await flow.createFlowResult();
    return report.steps[0].lhr.audits;
  } catch (err) {
    console.error(err);
    return {};
  }
};

module.exports = {
  getAudits: getAudits,
};
