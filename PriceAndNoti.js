const ptr = require('puppeteer')
const moment = require('moment')
const {Expo} = require('expo-server-sdk')
let expo = new Expo();
const cheerio = require('cheerio')
const axios = require('axios')
const crypto = require('crypto')


const nameAndPrice = async (url, tPrice, token, isFirstTime, priceArr, dateArr, itemKey, detailTable) => {
    let data = {}
    let rating, noOfRatings
    let isLowest = false
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

    if (isFirstTime) {
        priceArr = [null]
        dateArr = [null]
        detailTable = {}
    }


    const page = await browser.newPage()
    //Dont load any images
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.resourceType() === 'image')
            request.abort();
        else
            request.continue();
    });
    //Catch for any invalid url like sjajsja.com
    try {
        //network idle to make sure that the website finish loading
        await page.goto(url, {waitUntil: "networkidle2"})
    } catch (e) {
        data['name'] = 'Broken URL is given, did you copied correctly?'
        if (isFirstTime) {
            priceArr[priceArr.length - 1] = 'Broken URL is given, did you copied correctly?'
        } else {
            priceArr.push('Broken URL is given, did you copied correctly?')
        }
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
        let currentDate = new Date()
        data['name'] = getName
        data['lastUpdate'] = moment(currentDate).fromNow()
        data['itemKey'] = itemKey
        if (isFirstTime) {
            priceArr[priceArr.length - 1] = retrievePrice
            dateArr[dateArr.length - 1] = currentDate
            detailTable = {
                lowestPrice: retrievePrice, highestPrice: retrievePrice,
                lowRefTime: currentDate, highRefTime: currentDate,
                lowLastUpdate: moment(currentDate).fromNow(),
                highLastUpdate: moment(currentDate).fromNow()
            }
        } else {
            if (detailTable['lowestPrice'] > floatPrice) {
                isLowest = true
                detailTable['lowestPrice'] = retrievePrice
                detailTable['lowRefTime'] = currentDate
                detailTable['lowLastUpdate'] = moment(currentDate).fromNow()
            }
            if (detailTable['highestPrice'] < floatPrice) {
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
        }
        detailTable['rating'] = getRating
        detailTable['noOfRatings'] = getNoOfRatings
        data['price'] = priceArr
        data['dateArr'] = dateArr
        data['detailTable'] = detailTable
        ExpoPushNotification(tPrice, floatPrice, token, isFirstTime, getName, isLowest)
    } else {
        data['name'] = 'Broken URL is given, did you copied correctly?'
        priceArr[priceArr.length - 1] = 'Broken URL is given, did you copied correctly?'
        data['price'] = priceArr
    }
    await browser.close()
    return data;
}

const amazonEbayPriceAndName = async (url, tPrice, token, isFirstTime, priceArr, dateArr, itemKey, detailTable, is12pmReset) => {
    //const AMAZONID = ["#productTitle", "#priceblock_dealprice", "#priceblock_ourprice"]
    const EBAYID = ["#vi-lkhdr-itmTitl", "#mm-saleDscPrc", "#convbinPrice", "#prcIsum", "#histogramid", ".ebay-review-start-rating", ".ebay-reviews-count"]
    const QOO10ID = ['#goods_name', '#div_GroupBuyRegion', '#discount_info', '#dl_sell_price', '#ctl00_div_satis_percent', "#opinion_count"]
    let data = {}
    let isLowest = false
    let name, price, rating, noOfRatings
    if (isFirstTime) {
        priceArr = [null]
        dateArr = [null]
        detailTable = {}
    }
    //to reduce redundancy in code

    try {
        let response = await axios.get(url)
        const $ = await cheerio.load(response.data)
        if (url.includes("ebay")) {
            rating = await $(EBAYID[4]).find(EBAYID[5])
            noOfRatings = await $(EBAYID[4]).find(EBAYID[6])
            if (rating.html() != null) {
                rating = parseFloat(rating.html())
                noOfRatings = parseFloat(noOfRatings.html().replace(/\D/g, ""))
            } else {
                rating = "0"
                noOfRatings = "0"
            }
            name = await $(EBAYID[0]).html().trim()
            price = await $(EBAYID[1]).html()
            //no discount price
            if (price == null) {
                price = await $(EBAYID[2])
                //check if it is non-standard currency
                if (price.html() == null) {
                    price = await $(EBAYID[3]).html()
                } else {
                    //make it either usd or sgd depending whether u are using ebay.com.sg or ebay.com
                    price = await price[0].childNodes[0].nodeValue.trim()
                }
            }
        } else {
            rating = await $(QOO10ID[4]).find('strong').text()
            rating = parseFloat(rating.replace('%', ''))
            noOfRatings = await $(QOO10ID[5]).html()
            noOfRatings = parseFloat(noOfRatings.replace(/\D/g, ""))
            name = await $(QOO10ID[0]).clone().children().remove().end().text()
            price = await $(QOO10ID[1]).find('.prc > strong').html()
            //if it does not have group price
            if (price == null) {
                price = await $(QOO10ID[2]).find('dd > strong').html()
                //if it does not have discount
                if (price == null) {
                    price = await $(QOO10ID[3]).find('dd > strong').html()
                }
            }
            //check if name is blank ''
            if (name == "") {
                throw error("item not found")
            }
        }

    } catch (e) {
        data['name'] = 'Broken URL is given, did you copied correctly?'
        priceArr[priceArr.length - 1] = ('Broken URL is given, did you copied correctly?')
        data['price'] = priceArr
        return data
    }
    data["name"] = name
    let currentDate = new Date()
    data['itemKey'] = itemKey
    data['lastUpdate'] = moment(currentDate).fromNow()
    if (isFirstTime) {
        priceArr[priceArr.length - 1] = price.replace(" ", "")
        dateArr[dateArr.length - 1] = currentDate
        detailTable = {
            lowestPrice: price, highestPrice: price,
            lowRefTime: currentDate, highRefTime: currentDate,
            lowLastUpdate: moment(currentDate).fromNow(),
            highLastUpdate: moment(currentDate).fromNow(),
            rating: rating,
            noOfRatings: noOfRatings
        }
    } else {

        let floatPrice = parseFloat(price.replace(/[^\d.-]/g, ""))
        let lowestPrice = parseFloat(detailTable['lowestPrice'].replace(/[^\d.-]/g, ""))
        console.log("lowestPrice")
        let highestPrice = parseFloat(detailTable['highestPrice'].replace(/[^\d.-]/g, ""))
        if (lowestPrice > floatPrice) {
            isLowest = true
            detailTable['lowestPrice'] = price
            detailTable['lowRefTime'] = currentDate
            detailTable['lowLastUpdate'] = moment(currentDate).fromNow()
        }
        if (highestPrice < floatPrice) {
            detailTable['highestPrice'] = price
            detailTable['highRefTime'] = currentDate
            detailTable['highLastUpdate'] = moment(currentDate).fromNow()
        }
        if (is12pmReset) {
            if (priceArr.length === 7) {
                priceArr.shift()
                dateArr.shift()

            }
            priceArr.push(price)
            dateArr.push(currentDate)
        } else {
                priceArr[priceArr.length - 1] = price
            dateArr[dateArr.length - 1] = currentDate
        }
    }
    detailTable['rating'] = rating
    detailTable['noOfRatings'] = noOfRatings
    data['dateArr'] = dateArr
    data['price'] = priceArr
    data['detailTable'] = detailTable
    let floatPrice = parseFloat(price.replace(/[^\d.-]/g, ""))
    ExpoPushNotification(parseFloat(tPrice), floatPrice, token, isFirstTime, name, isLowest)
    return data;
}


const ExpoPushNotification = (tPrice, floatPrice, token, isFirstTime, name, isLowest) => {
    let messages = []
    if (!isFirstTime) {

        if (tPrice > floatPrice) {
            if (!isLowest) {
                messages.push({
                    to: token,
                    sound: 'default',
                    title: 'Price drop for ' + name + '!!',
                    body: 'CurrentPrice: $' + floatPrice + "\n\nTargetPrice: $" + tPrice,
                })
            } else {
                messages.push({
                    to: token,
                    sound: 'default',
                    title: 'Lowest Price recorded for ' + name + '!!!',
                    body: 'CurrentPrice: $' + floatPrice + "\nTargetPrice: $" + tPrice,
                })
            }
            expo.sendPushNotificationsAsync(messages);
        }
    }
}

module.exports = {nameAndPrice, amazonEbayPriceAndName, ExpoPushNotification}
