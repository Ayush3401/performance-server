const config = require("./config");
const { UserFlow } = require("./user-flow");
require("dotenv").config();

const MAX_WAIT_TIME = process.env.MAX_WAIT_TIME || 60000;

/**
 * Function get performance audits for a website using lighthouse
 * @param {string} url url of website to test
 * @param {object} headers additional headers to pass on e.g. Authorization, Cookie, etc
 * @returns audits provided by lighthouse corresponding to the url, headers pair
 */
const getAudits = async (url, headers, formFactor, browser, waitTime) => {
  let paintTimings;
  // Configurations for lighthhouse
  try {
    let options = config.getOptions(formFactor, headers);
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setDefaultNavigationTimeout(0);
    const flow = new UserFlow(page, {
      configContext: {
        settingsOverrides: options,
      },
    });
    if (isNaN(waitTime) || waitTime === 0) await flow.navigate(url);
    else {
      await flow.startTimespan();
      await page.goto(url);
      await new Promise((r) =>
        setTimeout(r, Math.min(MAX_WAIT_TIME, waitTime))
      );
      paintTimings = await page.evaluate(function () {
        return JSON.stringify(window.performance.getEntriesByType("paint"));
      });
      await flow.endTimespan();
    }
    await page.close();
    let report = await flow.createFlowResult();
    if (!isNaN(waitTime) && waitTime > 0) {
      const fcp = JSON.parse(
        paintTimings
      ).find(({ name }) => name === "first-contentful-paint");
      report.steps[0].lhr.audits["first-contentful-paint"] = {
        id: "first-contentful-paint",
        numericValue: fcp.startTime
      }
    }
    return report.steps[0].lhr.audits;
  } catch (err) {
    console.error(err);
    return {};
  }
};

module.exports = {
  getAudits: getAudits,
};
