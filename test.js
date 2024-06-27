const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { HttpsProxyAgent } = require("https-proxy-agent");

const agent = new HttpsProxyAgent("http://127.0.0.1:7890");
// const url = "http://hkg.download.datapacket.com/1000mb.bin"; // 替换为要下载的文件 URL
// const url = "https://speed.cloudflare.com/__down?during=download&bytes=1073741824"; // 替换为要下载的文件 URL
const url = "http://hkg.download.datapacket.com/1000mb.bin"
// const url = "https://speed.cloudflare.com/__down?during=download&bytes=1073741824"
const filePath = path.join(__dirname, "large_file.zip"); // 指定下载文件的保存路径



function speed() {
  return new Promise((resolve, reject) => {

    const startTime = Date.now();
    const file = fs.createWriteStream(filePath);
    let downloadedBytes = 0;
    let s = 0;
    let times = 5
    let speedArr = [];


    (url.startsWith('https') ? https : http)
      .get(url, { agent }, (res) => {
        const total = (
          parseInt(res.headers["content-length"], 10) /
          1024 /
          1024
        ).toFixed(2);
        let time = Date.now();

        setTimeout(() => {
          res.destroy()
          resolve(speedArr)
        }, 6000);


        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          s += chunk.length;

          file.write(chunk);
          if (Date.now() - time > 1000) {
            time = Date.now();
            const downloadSpeed = (s / 1024 / 1024).toFixed(2);

            console.log(`(${downloadSpeed} MB/s)`);
            s = 0;
            speedArr.push(downloadSpeed)
            --times
            if (times <= 0) {
              res.destroy()
              resolve(speedArr)
            }
          }

        });

        res.on("end", () => {
          file.end();
          const duration = (Date.now() - startTime) / 1000;
          console.log(`Download completed in ${duration.toFixed(2)} seconds.`);
          resolve(speedArr)
        });
      })
      .on("error", (err) => {
        console.error("Error:", err);
        file.close();
        fs.unlink(filePath, () => {
          console.log("Download failed, file deleted.");
        });
        resolve(speedArr)
      });
  })
}


module.exports = { speed }