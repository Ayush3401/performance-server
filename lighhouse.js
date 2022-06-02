const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const constants = require('./constants');

const getAudits = async (url, config) => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless', '--disable-gpu']});
  let {mobileConfig, desktopConfig} = constants
  try{
    const runnerResult = await lighthouse(url, {port: chrome.port}, config === 'mobile'? mobileConfig: desktopConfig);
    const audits = runnerResult.lhr.audits
    await chrome.kill();
    return audits
  }
  catch(err){
    console.error(err)
    await chrome.kill();
  }
}

module.exports = {
  getAudits: getAudits,
}