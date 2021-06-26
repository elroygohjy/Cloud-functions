const ptr = require('puppeteer')
const moment = require('moment')
const {Expo} = require('expo-server-sdk')
let expo = new Expo();
const cheerio = require('cheerio')
const axios = require('axios')


const nameAndPrice = async (url, tPrice, token, isFirstTime) => {
    let data = {}
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
        data['price'] = 'Broken URL is given, did you copied correctly'

    }
    const priceSelector = await page.$('._3e_UQT')
    const nameSelector = await page.$('.attM6y')
    //if the website don't have css for name and price, meaning website fully loaded but it is item not found or 404
    if (nameSelector !== null && priceSelector !== null) {
        const retrievePrice = await page.evaluate(() => {
            const price_HTML = document.querySelector('._3e_UQT')
            const price = price_HTML.innerHTML
            return price
        })

        const getName = await page.evaluate(() => {
            const name_HTML = document.querySelector('.attM6y')
            const name = name_HTML.textContent
            return name

        })
        const floatPrice = parseFloat(retrievePrice.replace("$", ""))
        data['name'] = getName
        data['price'] = retrievePrice
        data['refTime'] = new Date()
        data['lastUpdate'] = moment(data['refTime']).fromNow()

        ExpoPushNotification(tPrice, floatPrice, token, isFirstTime, getName)
    } else {
        data['name'] = 'Broken URL is given, did you copied correctly?'
        data['price'] = 'Broken URL is given, did you copied correctly?'

    }
    await browser.close()
    return data;
}

const amazonEbayPriceAndName = async (url, tPrice, token, isFirstTime) => {
    const AMAZONID = ["#productTitle", "#priceblock_dealprice", "#priceblock_ourprice"]
    const EBAYID = ["#vi-lkhdr-itmTitl", "#mm-saleDscPrc", "#convbinPrice", "#prcIsum"]
    const QOO10ID = ['#goods_name', '#div_GroupBuyRegion', '#discount_info', '#dl_sell_price']
    let data = {}
    let name, price;

    try {
        let response = await axios.get(url)
        const $ = await cheerio.load(response.data)
        if (url.includes("ebay")) {
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
        } else if (url.includes("amazon")) {
            name = await $(AMAZONID[0]).html().trim()
            price = await $(AMAZONID[1]).html()
            if (price == null) {
                price = await $(AMAZONID[2]).html()
            }
        } else {
            name = await $(QOO10ID[0]).clone().children().remove().end().text()
            price = await $(QOO10ID[1]).find('.prc > strong').html()
            //if it does not have group price
            if (price == null) {
                price =  await $(QOO10ID[2]).find('dd > strong').html()
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
        data['price'] = 'Broken URL is given, did you copied correctly?'
        return data
    }
    data['name'] = name
    data['price'] = price.replace(" ", "")
    data['refTime'] = new Date()
    data['lastUpdate'] = moment(data['refTime']).fromNow()
    let floatPrice = parseFloat(price.replace(/[^\d.-]/g, ""))
    ExpoPushNotification(parseFloat(tPrice), floatPrice, token, isFirstTime, name)
    return data;
}




const ExpoPushNotification = (tPrice, floatPrice, token, isFirstTime, name) => {
    let messages = []
    if (!isFirstTime) {
        if (tPrice > floatPrice) {
            messages.push({
                to: token,
                sound: 'default',
                title: 'Price drop for' + name + '!!',
                body: 'Get this item now!',
            })

            expo.sendPushNotificationsAsync(messages);
        }
    }
}

module.exports = {nameAndPrice, amazonEbayPriceAndName, ExpoPushNotification }
