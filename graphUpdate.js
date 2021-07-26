const functions = require("firebase-functions");
const admin = require('firebase-admin');
const db = admin.firestore();
let moment = require('moment')
const priceAndNoti = require('./PriceAndNoti')
let ptr = require('puppeteer')

exports.graphUpdate = functions.region("asia-southeast1").runWith({memory: '8GB', timeoutSeconds: 300})
    .pubsub.schedule('0 20 * * *').timeZone('Etc/GMT+8').onRun(async (context) => {
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
                        let isLowest = false
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
                            priceArr.push('Broken URL is given, did you copied correctly?')
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
                                let rating
                                if (ratingHTML != null) {
                                    rating = ratingHTML.textContent
                                } else {
                                    rating = 0
                                }
                                return rating
                            })
                            const getNoOfRatings = await page.evaluate(() => {
                                const noOfRatingsHTML = document.querySelectorAll('.OitLRu')[1]
                                let noOfRatings = 0
                                if (noOfRatingsHTML != null || noOfRatingsHTML !== undefined) {
                                    noOfRatings = noOfRatingsHTML.textContent
                                } else {
                                    noOfRatings = 0
                                }
                                return noOfRatings
                            })
                            const floatPrice = parseFloat(retrievePrice.replace("$", ""))
                            const lowestPrice = parseFloat(detailTable['lowestPrice'].replace("$", ""))
                            const highestPrice = parseFloat(detailTable['highestPrice'].replace("$", ""))

                            let currentDate = new Date()
                            data['name'] = getName
                            data['lastUpdate'] = moment(currentDate).fromNow()
                            data['itemKey'] = itemKey
                            if (lowestPrice > retrievePrice) {
                                isLowest = true
                                detailTable['lowestPrice'] = retrievePrice
                                detailTable['lowRefTime'] = currentDate
                                detailTable['lowLastUpdate'] = moment(currentDate).fromNow()
                            }
                            if (highestPrice < retrievePrice) {
                                detailTable['highestPrice'] = retrievePrice
                                detailTable['highRefTime'] = currentDate
                                detailTable['highLastUpdate'] = moment(currentDate).fromNow()
                            }
                            if (priceArr.length === 7) {
                                priceArr.shift()
                                dateArr.shift()

                            }
                            priceArr.push(retrievePrice)
                            dateArr.push(currentDate)

                            detailTable['rating'] = parseFloat(getRating)
                            detailTable['noOfRatings'] = getNoOfRatings
                            data['price'] = priceArr
                            data['dateArr'] = dateArr
                            data['detailTable'] = detailTable
                            priceAndNoti.ExpoPushNotification(tPrice, floatPrice, token, false, getName, isLowest)
                        } else {
                            data['name'] = 'Broken URL is given, did you copied correctly?'
                            priceArr[priceArr.length - 1] = 'Broken URL is given, did you copied correctly?'
                            data['price'] = priceArr
                        }
                        await page.close()
                    } else {
                        data = await priceAndNoti.amazonEbayPriceAndName(url, tPrice, token, false, priceArr, dateArr, itemKey, detailTable, true)
                    }
                    if (isNameSetByUser) {
                        data['name'] = name
                    }
                    await db.collection('users').doc(id).collection('items').doc(item_id).update(data)
                    return null
                }
            )

            const completedPromises = await Promise.all(promises)
            await browser.close()
        }

        for (let user of usersSnapShot.docs) {
            const userID = user.id
            await massRefresh(userID)
    }
})

