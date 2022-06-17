const dotenv = require("dotenv");
const cors = require("cors");
const express = require("express");
const { getAudits } = require("./audits");
const puppeteer = require('puppeteer');

const app = express();
dotenv.config();
app.use(cors());

const SERVER_PORT = process.env.SERVER_PORT || 8080;
let browser

app.get("/", async (req, res) => {
  // Get url, headers from request params
  let { url, headers, formFactor, waitTime } = req.query;
  headers = JSON.parse(headers);
  const audits = await getAudits(url, headers, formFactor, browser, Number(waitTime));

  if (audits !== {}) res.send(audits);
  else res.status(500).send(audits);
});

app.listen(SERVER_PORT, async () => {
  console.log(`Server running on  http://localhost:${SERVER_PORT}`);

  browser = await puppeteer.launch({
    // Optional, if you want to see the tests in action.
    headless: false,
  });
});
