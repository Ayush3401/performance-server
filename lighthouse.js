const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const constants = require('./constants');

const getAudits = async (url) => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless', '--disable-gpu']});
  const options = {onlyAudits: [
    'resource-summary',
    'mainthread-work-breakdown',
    'bootup-time',
    'third-party-summary',
    'network-requests',
    'network-rtt',
    'network-server-latency',
  ], port: chrome.port};
  try{
    const runnerResult = await lighthouse(url, options);
    const audits = runnerResult.lhr.audits
    await chrome.kill();
    return audits
  }
  catch(err){
    console.error(err)
    await chrome.kill();
    return {}
  }
}

module.exports = {
  getAudits: getAudits,
}