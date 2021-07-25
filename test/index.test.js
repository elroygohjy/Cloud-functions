const admin = require('firebase-admin');
let assert = require('chai').assert
let expect = require('chai').expect

const myFunctions = require('../index.js');

//To wait for execution of cloud functions
function wait(ms) {
    let start = new Date().getTime();
    let end = start;
    while (end < start + ms) {
        end = new Date().getTime();
    }
}

let invalidAmazon = {
    URL: 'https://www.amazon.sg/gp/bestsellers?ref_=nav_cs_bestsellers_c5fa267d7f2f43e0ab8a9db906b8ff70',
    TargetPrice: 100
}
let invalidAmazonSg = {
    URL: 'https://www.amazon.sg/b/ref=shvl_desk1_groc?ie=UTF8&node=6314506051&pf_rd_r=F3Z9EK0TDSXN3H9XWZQG&pf_rd_p=e3865d46-09a1-48c3-bfb0-8c630e6d9367&pd_rd_r=3d809a5a-5ca7-4192-9f06-77cee24afc75&pd_rd_w=y7oEC&pd_rd_wg=oGZkn&ref_=pd_gw_unk',
    TargetPrice: 100
}
let wrongEbay = {
    URL: 'https://www.ebay.com/b/Fashion/bn_7000259856',
    TargetPrice: 100
}
let wrongEbaySG = {
    URL: 'https://www.ebay.com.sg/sch/Smart-Watches/178893/i.html?_from=R40&_nkw&LH_BIN=1&rt=nc&_pppn=r1&LH_FS=1&_fosrp=1',
    TargetPrice: 100
}
let wrongQoo10 = {
    URL: 'https://www.qoo10.sg/gmkt.inc/Bestsellers/?g=0&banner_no=12031#g_412517321',
    TargetPrice: 200
}

let validAmazon = {
    URL: 'https://www.amazon.com/AmazonBasics-Mid-Back-Office-Chair-Armrests/dp/B00IIFW2L4/ref=pd_rhf_gw_s_pb_pd_deals_0_4?_encoding=UTF8&ie=UTF8&pd_rd_i=B00IIFW2L4&pd_rd_r=ENRSAJQZYNCX1YX8QYRC&pd_rd_w=W6w7Y&pd_rd_wg=r1BkQ&pf_rd_p=fa641abf-4acb-4e9b-87b4-1f589a5de483&pf_rd_r=ENRSAJQZYNCX1YX8QYRC&pf_rd_s=recent-history-footer&pf_rd_t=gateway&psc=1&refRID=ENRSAJQZYNCX1YX8QYRC',
    TargetPrice: 1000
}
let validAmazonSg = {
    URL: 'https://www.amazon.sg/Desitin-Maximum-Strength-Oxide-Diaper/dp/B000GCL3AS?ref_=Oct_DLandingS_PC_8868fdee_0&smid=ACT6OAM3OSC9S',
    TargetPrice: 10
}
let validEbay = {
    URL: 'https://www.ebay.com/itm/164778001667?_trkparms=aid%3D777001%26algo%3DDISCO.FEED%26ao%3D1%26asc%3D232925%26meid%3D6375badfd16b4c58b277895e8861a64e%26pid%3D100656%26rk%3D1%26rkt%3D1%26itm%3D164778001667%26pmt%3D0%26noa%3D1%26pg%3D2380057%26algv%3DRelatedTopicsKWTitleSRPSeeAll%26brand%3DMarvel+Legends&_trksid=p2380057.c100656.m5063&_trkparms=pageci%3Ad2e09baf-d41c-11eb-8b39-96abc4096005%7Cparentrq%3A38ccc87a17a0a9d95acf7a1efff0ac8e%7Ciid%3A2',
    TargetPrice: 50
}

let validEbaySG = {
    URL: 'https://www.ebay.com.sg/itm/143376855542?hash=item2161ed31f6:g:S2AAAOSwJpxddGQ0',
    TargetPrice: 100
}

let validQoo10 = {
    URL: 'https://www.qoo10.sg/item/DURIAN%e6%a6%b4%e5%8f%a3%e6%b0%b4-23-5-PAHANG-MSW-BLACK-GOLD-BLACK-THORN-CHEAPEST-IN/656685956',
    TargetPrice: 10
}

let validShopee = {
    URL: 'https://shopee.sg/Johnnie-Walker-Blue-Label-Blended-Scotch-Whisky-700ml-With-2-Crystal-Glasses-i.422447430.5185624098',
    TargetPrice: 100
}

let shopeeAbove18Item = {
    URL: 'https://shopee.sg/10pcs-box-Ice-Fire-Ultra-thin-0.01-Condom-Gel-Delayed-Classic-Hydro-Warm-Healthy-Best-Condom-i.281720694.9619911429',
    TargetPrice: 100
}

let invalidShopee = {
    URL: 'https://shopee.sg/m/cashback-special',
    TargetPrice: 10
}

//delay may differ for different website, shopee takes the longest, as i need to load the javascript website
const wrongURLTest = async (data, delay) => {
    const snap = await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').set(data)
    await wait(delay)
    const snapShot = await admin.firestore().collection("users/test@test.com/items").doc("itemTest1").get()
    try {
        const name = snapShot.data().name
        const price = snapShot.data().price
        assert.equal(name, 'Broken URL is given, did you copied correctly?')
        assert.equal(price, 'Broken URL is given, did you copied correctly?')
    } catch (e) {
        throw e
    } finally {
        await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').delete()
    }
}


// describe("Invalid URL Test", () => {
//     it("wrong amazon link", () => wrongURLTest(invalidAmazon, 5000))
//     it("wrong amazon SG link", () => wrongURLTest(invalidAmazon, 5500))
//     it("wrong ebay link", () => wrongURLTest(wrongEbay, 5000))
//     it("wrong ebay sg link", () => wrongURLTest(wrongEbaySG, 5000))
//     it("wrong Qoo10 Link", () => wrongURLTest(wrongQoo10, 5500))
//     it("wrong Shopee Link", () => wrongURLTest(invalidShopee, 15000))
// })


const validURLTest = async (data, delay) => {
    const snap = await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').set(data)
    await wait(delay)
    const snapShot = await admin.firestore().collection("users/test@test.com/items").doc("itemTest1").get()
    try {
        const name = snapShot.data().name
        const price = snapShot.data().price
        expect(name).to.be.a('string')
        expect(price).to.be.a('string') //we let price be string as it might be in different currency and we do price comparision backend
    } catch (e) {
        throw e
    } finally {
        await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').delete()
    }
}

// describe("valid URL Test", () => {
//     it("working amazon link", () => validURLTest(validAmazon, 6000))
//     it("working amazon SG link", () => validURLTest(validAmazonSg, 6000))
//     it("working ebay link", () => validURLTest(validEbay, 6000))
//     it("working ebay sg link", () => validURLTest(validEbaySG, 6000))
//     it("working Qoo10 Link", () => validURLTest(validQoo10, 6000))
//     it("working Shopee Link", () => validURLTest(validShopee, 15000))
//     it("working Shopee Link for above 18", () => validURLTest(shopeeAbove18Item, 15000))
//     }
// )
let url1 = {
    URL: 'https://shopee.sg/Noblesse-Cabernet-Sauvignon-2020-Central-Valley-12.0-750ml-i.230389798.5523242232',
    TargetPrice: 100
}

let url2 = {
    URL: 'https://shopee.sg/Optimum-Nutrition-Gold-Standard-Whey-5.5-lbs-Double-Rich-Chocolate-i.18254273.2390409239',
    TargetPrice: 100
}
let url3 = {
    URL: 'https://shopee.sg/Optimum-Nutrition-Gold-Standard-Whey-1lb-Amino-Energy-(Sticks)-Melatonin-(100-Tabs)-Bundle-Deal-i.18254273.9564729994',
    TargetPrice: 100
}
let url4 = {
    URL: 'https://shopee.sg/Philosophy-Amazing-Grace-Ballet-Rose-Spray-Fragrance-60ml-i.432223668.7287711525',
    TargetPrice: 100
}
let url5 = {
    URL: 'https://shopee.sg/-Korean-Snack-CW-Chewy-Chocolate-Chip-Cookie-90g-i.283590323.5647741869',
    TargetPrice: 100
}
let url6 = {
    URL: 'https://shopee.sg/-SG-Bluetooth-Mouse-Wireless-Mice-BWM-Universal-Compatibility-for-Laptop-Desktop-i.75632239.5742799080',
    TargetPrice: 100
}
let url7 = {
    URL: 'https://shopee.sg/DIY-Assembled-Engineering-Vehicle-Excavator-with-Nut-Screwdriver-Combination-Set-i.374546003.3777321942',
    TargetPrice: 100
}

const validURLTest2 = async () => {
    //const snap = await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').set({PriceAndDate: [{x: 5, y: new Date()}, {x: 6, y: new Date('Apr 20 2022')}]})
    const itemCollection = await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').get()
    let item2 = await itemCollection.data()
    let item = item2.PriceAndDate
    item.push({x: 6, y: new Date()})
    await admin.firestore().collection("users/test@test.com/items").doc('itemTest1').update({PriceAndDate: item})
}

describe("valid URL Test", () => {
        it("shopee link 1", () => validURLTest2())
        // it("shopee link 2", () => validURLTest(url2, 10000))
        // it("shopee link 3", () => validURLTest(url3, 10000))
        // it("shopee link 4", () => validURLTest(url4, 10000))
        // it("shopee link 5", () => validURLTest(url5, 10000))
        // it("shopee link 6", () => validURLTest(url6, 10000))
        // it("shopee link 7", () => validURLTest(url7, 10000))
    }
)







