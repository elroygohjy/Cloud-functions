const functions = require("firebase-functions");
const ptr = require('puppeteer')
const admin = require('firebase-admin');
const db = admin.firestore();
let moment = require('moment')

const priceAndNoti = require('./PriceAndNoti')

exports.scheduledWebScrap = functions.runWith({
    memory: '8GB',
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
    const id = context.auth.token.email
    const userSnapShot = await db.collection('users').doc(id).get()
    const token = await userSnapShot.data().token
    const itemSnapShot = await db.collection("users/" + id + "/items").get()
    const promises = itemSnapShot.docs.map(async doc => {
        const dataObject = await doc.data()
        const url = await dataObject.URL
        const item_id = doc.id
        const tPrice = dataObject.TargetPrice
        const priceArr = dataObject.price
        const dateArr = dataObject.dateArr
        const itemKey = dataObject.itemKey
        const detailTable = dataObject.detailTable
        const isNameSetByUser = dataObject.edited
        const name = dataObject.name

        let data = {}
        if (url.includes("shopee")) {
            const page = await browser.newPage()
            await page.setRequestInterception(true);
            await page.on('request', request => {
                if (request.resourceType() === 'image')
                    request.abort();
                else
                    request.continue();
            });

            try {
                //network idle to make sure that the website finish loading
                await page.goto(url, {waitUntil: "networkidle2"})
            } catch (e) {
                data['name'] = 'Broken URL is given, did you copied correctly?'
                priceArr[priceArr.length - 1] = ('Broken URL is given, did you copied correctly?')
                data['price'] = priceArr
            }
            const priceSelector = await page.$('._3e_UQT')
            const nameSelector = await page.$('.attM6y')
            await page.$('.OitLRu')
//if the website don't have css for name and price, meaning website fully loaded but it is item not found or 404
            if (nameSelector !== null && priceSelector !== null) {
                const retrievePrice = await page.evaluate(() => {
                    const priceHTML = document.querySelector('._3e_UQT')
                    const price = priceHTML.innerHTML
                    return price
                })

                const getName = await page.evaluate(() => {
                    const nameHTML = document.querySelector('.attM6y')
                    const name = nameHTML.textContent
                    return name

                })

                const getRating = await page.evaluate(() => {
                    const ratingHTML = document.querySelector('.OitLRu')
                    const rating = ratingHTML.textContent
                    return rating
                })
                const getNoOfRatings = await page.evaluate(() => {
                    const noOfRatingsHTML = document.querySelectorAll('.OitLRu')[1]
                    const noOfRatings = noOfRatingsHTML.textContent
                    return noOfRatings
                })
                const floatPrice = parseFloat(retrievePrice.replace("$", ""))
                let currentDate = new Date()
                data['name'] = getName
                data['lastUpdate'] = moment(currentDate).fromNow()
                data['itemKey'] = itemKey

                if (detailTable['lowestPrice'] > retrievePrice) {
                    detailTable['lowestPrice'] = retrievePrice
                    detailTable['lowRefTime'] = currentDate
                    detailTable['lowLastUpdate'] = moment(currentDate).fromNow()
                }
                if (detailTable['highestPrice'] < retrievePrice) {
                    detailTable['highestPrice'] = retrievePrice
                    detailTable['highRefTime'] = currentDate
                    detailTable['highLastUpdate'] = moment(currentDate).fromNow()
                }

                priceArr[priceArr.length - 1] = (retrievePrice)
                dateArr[dateArr.length - 1] = (currentDate)

                detailTable['rating'] = getRating
                detailTable['noOfRatings'] = getNoOfRatings
                data['price'] = priceArr
                data['dateArr'] = dateArr
                data['detailTable'] = detailTable
                priceAndNoti.ExpoPushNotification(tPrice, floatPrice, token, false, getName)
            } else {
                data['name'] = 'Broken URL is given, did you copied correctly?'
                priceArr[priceArr.length - 1] = 'Broken URL is given, did you copied correctly?'
                data['price'] = priceArr
            }
        } else {
            data = await priceAndNoti.amazonEbayPriceAndName(url, tPrice, token, false, priceArr, dateArr, itemKey, detailTable)
        }
        if (isNameSetByUser) {
            data['name'] = name
        }
        await db.collection('users').doc(id).collection('items').doc(item_id).update(data)
        return null
    })
    const completedPromises = await Promise.all(promises)
    await browser.close()
    return {message: "success"}
})
