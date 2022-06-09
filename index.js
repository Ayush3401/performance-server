const express = require("express");
const cors =require('cors');
const app = express();
app.use(cors());
const {getAudits} = require('./lighthouse')
const PORT = 8000;

app.get("/", async (req, res) => {
  const url = req.query.url
  const audits = await getAudits(url)
  res.send(audits)
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
