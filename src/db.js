const fs = require("fs");

function updateMetadata(url, formFactor, waitTime, dateString) {
  fs.readFile(__dirname + `/../db/meta.json`, "utf8", function (err, data) {
    if (err) throw err;
    data = JSON.parse(data);
    data.push({
      url,
      formFactor,
      waitTime,
      dateString,
    });
    fs.writeFile(__dirname + `/../db/meta.json`, JSON.stringify(data), (err) => {
      if (err) throw err;
    });
  });
}

function writeNewRecord(url, formFactor, waitTime, audits) {
  const dateString = new Date().toJSON();
  fs.writeFile(
    __dirname + `/../db/${dateString}.json`,
    JSON.stringify(audits),
    (err) => {
      if (err) throw err;
    }
  );
  updateMetadata(url, formFactor, waitTime, dateString);
}

function readMetadata(callback) {
  fs.readFile(__dirname + `/../db/meta.json`, "utf8", callback);
}

function readRecord(filename, callback) {
  fs.readFile(
    __dirname + `/../db/${filename}.json`,
    "utf8",
    callback
  );
}

module.exports = {
  writeNewRecord,
  readMetadata,
  readRecord,
};
