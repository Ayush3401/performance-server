const chromeLauncher = require("chrome-launcher");
const dotenv = require("dotenv");
const cors = require("cors");
const express = require("express");
const { getAudits } = require("./lighthouse");

const app = express();
dotenv.config();
app.use(cors());

const SERVER_PORT = process.env.SERVER_PORT || 8080;
const CHROME_PORT = process.env.CHROME_PORT || 12345;

app.get("/", async (req, res) => {
  // Get url, headers from request params
  const { url, headers } = req.query;
  headers = JSON.parse(headers);

  const audits = await getAudits(url, headers);

  if (audits !== {}) res.send(audits);
  else res.status(500).send(audits);
});

app.listen(SERVER_PORT, async () => {
  console.log(`Server running on  http://localhost:${SERVER_PORT}`);
  
  await chromeLauncher.launch({
    // On serve start launch chrome on CHROME_PORT
    port: CHROME_PORT,
  });
});
