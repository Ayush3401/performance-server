const fs = require("fs");

/**
 * This function checks if db/ folder exists and if not create it and a meta file inside it
 */
function createMetadata() {
  const dir = __dirname + `/../db`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  if (!fs.existsSync(dir + "/meta.json")) {
    // Create meta file with empty array as data
    fs.writeFile(dir + "/meta.json", JSON.stringify([]), (err) => {
      if (err) throw err;
    });
  }
}

/**
 * Add new data to the metadata file
 * @param {String} url 
 * @param {String} formFactor deviceType
 * @param {Number} waitTime 
 * @param {String} dateString 
 */
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
    fs.writeFile(
      __dirname + `/../db/meta.json`,
      JSON.stringify(data),
      (err) => {
        if (err) throw err;
      }
    );
  });
}

/**
 * Add a new file record for new analysis
 * @param {String} url 
 * @param {String} formFactor
 * @param {Number} waitTime 
 * @param {Object} audits Audits for the url
 */
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

/**
 * @param {Function} callback 
 */
function readMetadata(callback) {
  fs.readFile(__dirname + `/../db/meta.json`, "utf8", callback);
}


/**
 * @param {String} filename
 * @param {Function} callback
 */
function readRecord(filename, callback) {
  fs.readFile(__dirname + `/../db/${filename}.json`, "utf8", callback);
}

module.exports = {
  writeNewRecord,
  readMetadata,
  readRecord,
  createMetadata,
};
