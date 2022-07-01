const fs = require("fs");
const DB_DIRECTORY = __dirname + '/../../db'
/**
 * This function checks if db/ folder exists and if not create it and a meta file inside it
 */
function createMetadata() {
  if (!fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY);
  }
  if (!fs.existsSync(DB_DIRECTORY + "/meta.json")) {
    // Create meta file with empty array as data
    fs.writeFile(DB_DIRECTORY + "/meta.json", JSON.stringify([]), (err) => {
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
  fs.readFile(DB_DIRECTORY + `/meta.json`, "utf8", function (err, data) {
    if (err) throw err;
    data = JSON.parse(data);
    data.push({
      url,
      formFactor,
      waitTime: (waitTime/1000),
      dateString,
    });
    fs.writeFile(
      DB_DIRECTORY + `/meta.json`,
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
    DB_DIRECTORY + `/${dateString}.json`,
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
  fs.readFile(DB_DIRECTORY + `/meta.json`, "utf8", callback);
}


/**
 * @param {String} filename
 * @param {Function} callback
 */
function readRecord(filename, callback) {
  fs.readFile(DB_DIRECTORY + `/${filename}.json`, "utf8", callback);
}

module.exports = {
  writeNewRecord,
  readMetadata,
  readRecord,
  createMetadata,
};
