const functions = require("firebase-functions");
const admin = require('firebase-admin');
const db = admin.firestore();
let moment = require('moment')
const priceAndNoti = require('./PriceAndNoti')
let ptr = require('puppeteer')

exports.IntervalRefresh = functions.runWith( {memory: '8GB', timeoutSeconds: 300})
    .pubsub.schedule("every 30 minutes").onRun(async (context) => {
        const usersSnapShot = await db.collection("users").get()
        const massRefresh = async (email) => {
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
            const id = email
            const userSnapShot = await db.collection('users').doc(id).get()
            const token = await userSnapShot.data().token
            const itemSnapShot = await db.collection("users/" + id + "/items").get()
            for (let doc of itemSnapShot.docs) {
                const url = await doc.data().URL
                const item_id = doc.id
                const tPrice = await doc.data().TargetPrice
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
                        await page.goto(url, {waitUntil: "networkidle2"})
                    } catch (e) {
                        data['name'] = 'Broken URL is given, did you copied correctly?'
                        data['price'] = 'Broken URL is given, did you copied correctly?'
                        await db.collection('users').doc(id).collection('items').doc(item_id).update(data)
                    }

                    const priceSelector = await page.$('._3e_UQT')
                    const nameSelector = await page.$('.attM6y')
                    //if the website don't have css for name and price, meaning website fully loaded but it is item not found or 404
                    if (nameSelector !== null && priceSelector !== null) {
                        const retrievePrice = await page.evaluate(async () => {
                            const price_HTML = await document.querySelector('._3e_UQT')
                            const price = price_HTML.innerHTML
                            return price
                        })

                        const getName = await page.evaluate(() => {
                            const name_HTML = document.querySelector('.attM6y')
                            const name = name_HTML.textContent
                            return name
                        })
                        const floatPrice = await parseFloat(retrievePrice.replace("$", ""))
                        data['name'] = getName
                        data['price'] = retrievePrice
                        data['lastUpdate'] = await moment(new Date()).fromNow()
                        await priceAndNoti.ExpoPushNotification(tPrice, floatPrice, token, false, getName)
                        await db.collection('users').doc(id).collection('items').doc(item_id).update(data)

                    } else {
                        data['name'] = 'Broken URL is given, did you copied correctly?'
                        data['price'] = 'Broken URL is given, did you copied correctly?'
                    }
                    await page.close()
                } else {
                    data = await priceAndNoti.amazonEbayPriceAndName(url, tPrice, token, false)
                    await db.collection('users').doc(id).collection('items').doc(item_id).update(data)
                }
            }
            await browser.close()
        }

        for (let user of usersSnapShot.docs) {
            const userID  = user.id
            const interval = user.data().interval
            const firebaseDate = user.data().date
            let date
            if (firebaseDate != null) {
                date = firebaseDate.toDate()
                let currentDate = moment(new Date())
                if (currentDate.diff(date, 'hours') >= interval) {
                    await massRefresh(userID)
                    await db.collection('users').doc(userID).update({date: currentDate})
                }
            }
        }
    })
