const express = require("express");
const cors =require('cors');
const app = express();
const chromeLauncher = require("chrome-launcher");
app.use(cors());
const {getAudits} = require('./lighthouse')

const PORT = 8080;

app.get("/", async (req, res) => {
  const url = req.query.url
  console.log(JSON.parse(req.query.headers))
  const audits = await getAudits(url, JSON.parse(req.query.headers))
  if(audits!=={}) res.send(audits)
  else res.status(500).send(audits)
});

app.listen(PORT,async () => {
  console.log(`Example app listening on port ${PORT}`);
  await chromeLauncher.launch({
    port: 12345,
  });
});
