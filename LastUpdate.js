const functions = require("firebase-functions");
const admin = require('firebase-admin');
const db = admin.firestore();
let moment = require('moment')


exports.LastUpdate = functions.region('asia-east2')
    .runWith( {memory: '512MB', timeoutSeconds: 300}).pubsub.schedule("every 60 minutes").onRun((context) => {
        const updateTime = async () => {
            const usersSnapShot = await db.collection("users").get()
            for (let user of usersSnapShot.docs) {
                const user_id  = user.id
                const cur_db = db.collection("users/" + user_id + "/items")
                const itemSnapshot = await cur_db.get()
                for (let item of itemSnapshot.docs) {
                    const refTimeArr = item.data().dateArr
                    const detailTable = item.data().detailTable

                    if (refTimeArr !== undefined) {
                        let updateDict = {}
                        const lowRefTime = detailTable['lowRefTime']
                        const highRefTime = detailTable['highRefTime']
                        const refTime = refTimeArr[refTimeArr.length - 1]
                        updateDict['lastUpdate'] = await moment(refTime.toDate()).fromNow()
                        detailTable['lowLastUpdate'] = await moment(lowRefTime.toDate()).fromNow()
                        detailTable['highLastUpdate'] = await moment(highRefTime.toDate()).fromNow()
                        updateDict['detailTable'] = detailTable
                        await cur_db.doc(item.id).update(updateDict)
                    }
                }
            }
        }
        updateTime()
        return null;

    })
