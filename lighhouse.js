const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const getAudits = async (url) => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {logLevel: 'info', output: 'html', onlyCategories: ['performance'], port: chrome.port};
  const runnerResult = await lighthouse('https://www.sprinklr.com/', options);
  const audits = runnerResult.lhr.audits
  await chrome.kill();
  return audits
}

module.exports = {
  getAudits: getAudits,
}