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
                const refTime = item.data().refTime
                if (refTime != undefined) {
                    let updateDict = {}
                    updateDict['lastUpdate'] = await moment(refTime.toDate()).fromNow()
                    await cur_db.doc(item.id).update(updateDict)
                }
            }
        }
    }
    updateTime()
    return null;

})
