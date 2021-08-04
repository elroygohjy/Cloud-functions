# About this project
In this repo, cloud functions are written for invocation by both the front-end and onCreate operations when an item is added to the firebase firestore for our Android price-tracker app which can found at this url.
# Modules Used
## Puppeteer
Puppeteer is the library used to scrape item details from Shopee. Puppeteer is a Node library which provides a high-level API to control headless Chrome or Chromium. As Shopee is built with Javascript, we need to use Puppeteer to load the page in order to retrieve the item details. Therefore, we incur quite a hefty overhead as we need to open and close a headless browser at the backend.
## Cheerio
Cheerio is the module that allows us to directly web scrape from raw HTML. Since eBay and Qoo10 are built on HTML and CSS (and do not use JavaScript), we can use Cheerio as it is much faster than Puppeteer, with an average runtime of 1-3s. Cheerio uses jquery, so we had to learn and understand jquery in order to web scrape the information we wanted, especially for deeply nested fields.
## Notification
Expo Notification token is retrieved from the firebase firestore and we used the [Expo module](https://github.com/expo/expo-server-sdk-node) to send notification to respective phones when there is price drop below the targeted price for our app.

# Functions
## webScrap function
webScrap is our web-scraping function that is stored and invoked on Firebase Cloud Functions. It is invoked when a document is created in the path: “users/{user_id}/items”. After frontend validation of the URL and target price, the frontend will interact with Firestore by adding the item document to the aforementioned path, and create and populate the “Targetprice”, “URL” fields and “itemKey” field . The webScrap cloud function mainly uses two modules which are Puppeteer and Cheerio. 
Instead of populating the “price”, and “date” fields as value during invocation of cloud function, we store price and all dates fields as an array of at most 7 data points, as we intend to plot weekly price changes. 
## ScheduledWebScrap/IntervalRefresh function (Mass web-scraping)
This function is stored and invoked on Firebase Cloud functions. It is very similar to the webScrap function mentioned earlier,  it uses async function map and Promise.all to update time and price for all documents. IntervalRefresh is invoked via the front-end, via ScheduledWebScrap is only invoked depending on the notification time set by the user.
 Any updates of price from mass refresh or notification refresh would only reset the current index of point price and date in the array. (i.e priceArray: [$20] and dateArr: [16 July 2021 12pm] => invoking refresh cloud function => priceArray: [$21] and dateArr: [16 July 2021 1pm]) 
### 12pm global reset (invocation of Mass Webscrap function)
This 12pm global reset function is slightly different from scheduledWebScrap /intervalRefresh function as this webScrap function refreshes all prices and adds the price and date to the next index in the array. This is to ensure that the data point is well distributed over a week period of time, as it does not make sense to have a 7 data for price and date and the distribution is only a few minutes apart, as there is high likelihood that there are no price changes. If the length of the price and date array is 7, we will remove the first price and date values.


