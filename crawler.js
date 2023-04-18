const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const downloadFile = async (url, downloadDirectory = "downloads") => {
    const filename = path.basename(url);
    const filePath = path.join(downloadDirectory, filename);
    if(!fs.existsSync(downloadDirectory)) {
        fs.mkdirSync(downloadDirectory);
    }
    const writer = fs.createWriteStream(filePath);
    try {
        const timeout = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('download timeout');
            }, 10000);
        });

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        console.log(`${filename} Ok`);
        const result = await Promise.race([response.data, timeout]);

        if (typeof result === 'string' || result === 'download timeout') {
            console.log(`Downloading ${url} timed out`);
            return Promise.reject('Download timeout');
        }

        response.data.pipe(writer);
        console.log(`Downloaded ${filename}`);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch(error) {
        console.error(`Error downloading ${url}: ${error.message}`);
        return Promise.reject(error);
    }
};

const downloadAllFiles = async (urls, fileExtension) => {
    try {
        const response = await axios.get(urls);
        const $ = cheerio.load(response.data);
        const pdfLink = $(`a[href$=${fileExtension}]`);

        console.log(`Found ${pdfLink.length} PDF files on page ${urls} to download`);

        for (let i = 0; i < pdfLink.length; i++) {
            const link = $(pdfLink[i])
            const url = link.attr('href');
            try {
                console.log(`Downloading file (${i+1}/${pdfLink.length})...`);
                await downloadFile(url, './downloads');
            } catch (error) {
                console.log(`Failed to download ${url}: ${error.message}`);
                addFailedLink(url);
            }
        }
        console.log(`Successfully downloaded (${pdfLink.length-failedLinks.length}/${pdfLink.length}) files.`);
        makeFailedLinksFile();
    } catch(error) {
        console.error(`Failed to download files: ${error.message}`);
    } finally {
        start();
    }
}

failedLinks = [];
const addFailedLink = (link) => {
    failedLinks.push(link);
}

const makeFailedLinksFile = () => {
    const failedLinksFile = path.join(__dirname, 'failedLinks.txt');
    const failedLinksFileContent = failedLinks.join('\n');
    fs.writeFileSync(failedLinksFile, failedLinksFileContent);
}

const retryDownloadFailedLinks = async (failedLinksFileName = 'failedLinks.txt') => {
    const failedLinksFile = path.join(__dirname, failedLinksFileName);
    const failedLinksFileContent = fs.readFileSync(failedLinksFile, 'utf8');
    const failedLinksList = failedLinksFileContent.split('\n');

    for (let i = 0; i < failedLinksList.length; i++) {
        const link = failedLinkLists[i];
        try {
            console.log(`Downloading file ((${i+1}/${failedLinks.length})...`);
            await downloadFile(link, './downloads');
        } catch (error) {
            console.log(`Failed to download ${link}: ${error.message}`);
            addFailedLink(link);
        }
    }
    console.log(`Successfully downloaded (${failedLinks.length-failedLinks.length}/${failedLinks.length}) files.`);
    makeFailedLinksFile();
    start();
}

const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function start() {
    prompt.question('What do you want to do? (download, retry_download, exit) ', (action) => {
        if (action === 'download') {
            prompt.question('Enter the URL of the page to download files from: ', (url) => {
                prompt.question('Enter the file extension to download (e.g. .pdf, .mp3, .jpg, .jpeg): ', (fileExtension) => {
                    downloadAllFiles(url, fileExtension);
                });
            });
        } else if (action === 'retry_download') {
            retryDownloadFailedLinks('failedLinks.txt');
        } else if (action === 'exit') {
            console.log('Goodbye!');
            process.exit(0);
        } else {
            console.log('Invalid action');
        }
        start();
    });
}

start();

