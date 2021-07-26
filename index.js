const functions = require("firebase-functions");
const admin = require('firebase-admin');
let serviceAccount = require("./serviceKeyForOrbital.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hello-2fc57-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();

const lastUpdate = require('./LastUpdate')
const priceAndNoti = require('./PriceAndNoti')
const intervalRefresh = require('./IntervalRefresh')
const barcodeToURL = require('./barcodeToURL')
const scheduleWebScrap = require('./scheduleWebScrap')
const graphUpdate = require('./graphUpdate')
const errorString = 'Broken URL is given, did you copied correctly?'
const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '8GB'
}

exports.lastUpdate = lastUpdate.LastUpdate
exports.intervalRefresh = intervalRefresh.IntervalRefresh
exports.barcodeToURL = barcodeToURL.barcodeToURL
exports.scheduledWebScrap = scheduleWebScrap.scheduledWebScrap
exports.graphUpdate = graphUpdate.graphUpdate

exports.webScrap = functions.region('asia-southeast1').runWith(runtimeOpts)
    .firestore.document('users/{user_id}/items/{item_id}')
    .onCreate(async (snapshot, context) => {
        const itemID = context.params.item_id
        const userID = context.params.user_id
        const userSnapShot = await db.collection('users').doc(userID).get()
        const expo_key = await userSnapShot.data().token
        const obj = await snapshot.data()
        const url = await obj.URL
        const priceArr = await obj.price
        const dateArr = await obj.date
        const itemKey = await obj.itemKey
        let data;
        const targetPrice = await obj.TargetPrice
        if (url.includes("shopee")) {
            data = await priceAndNoti.nameAndPrice(url, targetPrice, expo_key, true, priceArr, dateArr, itemKey)
        } else {
            data = await priceAndNoti.amazonEbayPriceAndName(url, targetPrice, expo_key, true, priceArr, dateArr, itemKey, {}, false)
        }
        await db.collection('users').doc(userID).collection('items').doc(itemID).update(data)
        let itemKeyList = await userSnapShot.data().itemKeyList
        if (itemKeyList === undefined) {
            itemKeyList = []
            itemKeyList.push(itemKey)
        } else {
            if (!itemKeyList.includes(itemKey) && data['name'] !== errorString) {
                itemKeyList.push(itemKey)
            }
        }
        await db.collection('users').doc(userID).update({itemKeyList: itemKeyList})

    })
