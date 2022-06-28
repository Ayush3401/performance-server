#!/usr/bin/env node

const dotenv = require("dotenv");
const cors = require("cors");
const express = require("express");
const { getAudits } = require("./src/audits");
const puppeteer = require("puppeteer");
const {
  writeNewRecord,
  readMetadata,
  readRecord,
  createMetadata,
} = require("./src/db");

const app = express();
dotenv.config();
app.use(cors());

const SERVER_PORT = process.env.SERVER_PORT || 8080;
let browser;

app.get("/", async (req, res) => {
  // Get url, headers from request params
  let { url, formFactor, waitTime } = req.query;
  const audits = await getAudits(url, formFactor, browser, Number(waitTime));
  if (audits === {}) res.status(500).send(audits);
  else {
    writeNewRecord(url, formFactor, waitTime, audits);
    res.send(audits);
  }
});

app.get("/audits/", function (req, res) {
  readMetadata((err, data) => {
    if (err) throw err;
    res.send(JSON.parse(data));
  });
});

app.get("/audit/", async (req, res) => {
  // Get url, headers from request params
  const { filename } = req.query;
  readRecord(filename, (err, data) => {
    if (err) throw err;
    res.send(JSON.parse(data));
  });
});

app.listen(SERVER_PORT, async () => {
  browser = await puppeteer.launch({
    // Optional, if you want to see the tests in action.
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto("https://analyser.netlify.app");
  createMetadata();
});
