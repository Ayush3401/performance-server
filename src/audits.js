const config = require("./utils/config");
const { UserFlow } = require("./controllers/user-flow");
require("dotenv").config();
const colors = require("colors");
const loading = require("loading-cli");
const { Puppeteer } = require("puppeteer");

// Maximum waiting time for analysis
const MAX_WAIT_TIME = process.env.MAX_WAIT_TIME || 60000;

/**
 * Function to get performance audits for a website
 * @param {string} url url of website to test
 * @param {string} formFactor Device Type to simulate analysis on
 * @param {object} browser instance of browser on which the page will be loaded
 * @param {number} waitTime Time in ms to wait after page load
 * @returns Combined self made and lighthouse audits
 */
const getAudits = async (url, formFactor, browser, waitTime) => {
  // Show a loading statement on console
  const load = loading({
    text: `Analysing ${url}`.cyan,
    color: "green",
    interval: 80,
    stream: process.stdout,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  }).start();

  try {
    // Options for lighthouse i.e. deviceType
    let options = config.getOptions(formFactor);
    const page = await browser.newPage();
    // Remove navigation timeout error shown by puppeteer once the page doesn't load in 30 ms
    await page.setDefaultNavigationTimeout(0);
    let domcontentloadTime, loadTime, navigateTime;
    page.on("domcontentloaded", () => {
      domcontentloadTime = new Date();
    });
    page.on("load", () => {
      loadTime = new Date();
    });
    // Create a new lighthouse flow
    await page.setCacheEnabled(false);

    const flow = new UserFlow(page, {
      configContext: {
        settingsOverrides: options,
      },
    });
    // Navigate Flow
    if (isNaN(waitTime) || waitTime === 0) {
      navigateTime = new Date();
      await flow.navigate(url);
    }
    // Timespan flow
    else {
      // Start a timespan flow
      await flow.startTimespan();
      await page.goto(url, {
        waitUntil: "load",
      });
      // Waiting for waitTime
      await new Promise((r) =>
        setTimeout(r, Math.min(MAX_WAIT_TIME, waitTime))
      );
      // Generate fcp details for timespan view as lighthouse doesn't calculates it for timespan flow

      // Stop the flow once the waiting time is over
      await flow.endTimespan();
    }
    let performanceTimings = await page.evaluate(function () {
      return JSON.stringify(
        window.performance.getEntriesByType("navigation")[0]
      );
    });
    await page.close();
    performanceTimings = JSON.parse(performanceTimings);
    let report = await flow.createFlowResult();
    report.steps[0].lhr.audits["dom-content-loaded"] = {
      id: "dom-content-loaded",
      numericValue: performanceTimings.domContentLoadedEventEnd,
    };
    report.steps[0].lhr.audits["load"] = {
      id: "load",
      numericValue: performanceTimings.loadEventEnd,
    };
    load.succeed(`Generated Report for ${url}`.green);
    return report.steps[0].lhr.audits;
  } catch (err) {
    load.fail(`${err}`.red);
    return {};
  }
};

module.exports = {
  getAudits: getAudits,
};
