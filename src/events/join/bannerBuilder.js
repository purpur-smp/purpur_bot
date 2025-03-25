const path = require('path');
const puppeteer = require('puppeteer');

async function buildBanner(filePath = 'index.html', avatarUrl, pseudo) {
    const absolutePath = path.join(__dirname, filePath);

    const browser = await puppeteer.launch({});
    const page = await browser.newPage();

    await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('.picture');

    console.log(avatarUrl)

    await page.evaluate((url, pseudo) => {
        const pic = document.querySelector('.picture');
        if (pic) {
            pic.src = url;
        }

        const pseudoElement = document.querySelector('.pseudo');
        if (pseudoElement) {
            pseudoElement.innerHTML = pseudo;
        }
    }, avatarUrl, pseudo);

    await page.waitForFunction(() => {
        const img = document.querySelector('.picture');
        return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 5000 }).catch(() => console.log('Temps de chargement de l\'image dépassé'));

    const bannerElement = await page.$('.banner');

    let screenshotBase64;
    if (bannerElement) {
        screenshotBase64 = await bannerElement.screenshot({ encoding: 'base64' });
    } else {
        screenshotBase64 = await page.screenshot({ encoding: 'base64' });
    }

    await browser.close();

    return Buffer.from(screenshotBase64, 'base64');
}

module.exports = { buildBanner };
