const functions = require("firebase-functions");
const ptr = require('puppeteer')
const admin = require('firebase-admin');

const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '8GB'
}
exports.barcodeToURL = functions.runWith({
    memory: '2GB',
    timeoutSeconds: 300
}).https.onCall(async (data, context) => {
    const browser = await ptr.launch({
        args: ['--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'],
        headless: true,
        timeout: 0
    })
    const barcode = data.barcode
    const url = "https://www.ebay.com/sch/i.html?_from=R40&_trksid=p2380057.m570.l1313&_nkw=" + barcode + "+&_sacat=0&LH_TitleDesc=0&_odkw=663274770880&_osacat=0"
    const page = await browser.newPage()
    await page.setRequestInterception(true);
    await page.on('request', request => {
        if (request.resourceType() === 'image')
            request.abort();
        else
            request.continue();
    });
    let result
    await page.goto(url)
    const hrefs = await page.$$eval('.s-item__link', anchors => [].map.call(anchors, a => a.href));
    result = hrefs[1]
    if (result !== undefined) {
        return {success: result}
    } else {
        return {failure: 'Item not found in ebay.com.'}
    }
})
