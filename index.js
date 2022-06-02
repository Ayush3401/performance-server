const express = require("express");
const app = express();
const {getAudits} = require('./lighhouse')
const PORT = 3000;

app.get("/", async (req, res) => {
  const url = req.query.url
  const config = req.query.config
  const audits = await getAudits(url, config)
  res.send(audits)
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
