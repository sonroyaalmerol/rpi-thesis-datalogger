const DHT = require('node-dht-sensor').promises
var ads1x15 = require('node-ads1x15') // install this with npm i raspi raspi-i2c --save
var ADS = new ads1x15(1)

const getVraw = () => {
  return new Promise((resolve, reject) => {
    ADS.readADCSingleEnded(0, '4096', '250', function(err, data) {   
      if (err) {  
        //logging / troubleshooting code goes here...  
        reject(err)
      }
      // if you made it here, then the data object contains your reading!  
      //console.log(data)
      resolve(data)
      // any other data processing code goes here...  
    })
  })
}

const getIraw = () => {
  return new Promise((resolve, reject) => {
    ADS.readADCSingleEnded(1, '6144', '250', function(err, data) {   
      if (err) {  
        //logging / troubleshooting code goes here...  
        reject(err)
      }
      // if you made it here, then the data object contains your reading!  
      resolve(data)
      // any other data processing code goes here...  
    })
  })
}
//*/
const express = require('express')
const app = express()
app.set('view engine', 'ejs')
app.use(express.static('views/vendors'))
const PouchDB = require("pouchdb")
const port = 3000
const uniqid = require('uniqid')
const moment = require('moment')

const db = new PouchDB('thesis-data-demo')
var remoteDB = 'http://admin:admin123@thesis.mikumaprojects.com/thesis-data-demo'
const Poller = require('./poller')

// Set 3s timeout between polls
// note: this is previous request + processing time + timeout
let poller = new Poller(3000)

// Wait till the timeout sent our event to the EventEmitter
poller.onPoll(async () => {
  var Vraw, Iraw, Vout, Iout, humidity, temperature
  try {  
    Vraw = await getVraw()
    Iraw = await getIraw()
    Vout = Vraw * 0.632034632 / 1000
    Iout = (Iraw - 13775) * 0.000105949 / 0.1
  } catch (err) {
    console.log(err)
    Vout = 0
    Iout = 0
  }
  var { temperature, humidity } = await DHT.read(22, 4)

  db.put({
    _id: uniqid(),
    timestamp: new Date(),
    temperature: temperature.toFixed(1),
    humidity: humidity.toFixed(1),
    voltage: Vout,    
    current: Iout
  }).catch((err) => {
    console.log(err)
  })

  db.sync(remoteDB, {
    live: true,
    retry: true
  }).on('change', function (change) {
    console.log('data change', change)
  }).on('error', function (err) {
    console.log('sync error', err)
  })

  poller.poll() // Go for the next poll
})

// Initial start
poller.poll()

app.get('/', (req, res) => {
  db.allDocs({ include_docs: true }).then((result) => {
    res.render('table', { data: result.rows.map((item) => {
      var toReturn = item.doc
      toReturn.rawTimestamp = toReturn.timestamp
      toReturn.timestamp = moment(toReturn.timestamp).format("MMM DD YYYY, h:mm:ss a")
      return toReturn
    })})
  }, (error) => {
    res.status(400).send(error)
  })
})

app.listen(port, () => console.log(`Thesis API listening on port ${port}!`))
