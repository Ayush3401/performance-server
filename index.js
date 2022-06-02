const express = require("express");
const app = express();
const bodyParser = require('body-parser');  
const urlencodedParser = bodyParser.urlencoded({ extended: false })  
const {getAudits} = require('./lighhouse')
const PORT = 3000;

app.post("/", urlencodedParser, async (req, res) => {
  const url = req.body.url
  const audits = await getAudits(url)
  res.send(audits)
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
