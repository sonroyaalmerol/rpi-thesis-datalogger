const DHT = require('node-dht-sensor').promises
var ads1x15 = require('node-ads1x15') // install this with npm i raspi raspi-i2c --save
var ADS = new ads1x15(1)

const getVraw = () => {
  return new Promise((resolve, reject) => {
    var channel = 0 //channel 0, 1, 2, or 3...  
    var samplesPerSecond = '860' // see index.js for allowed values for your chip  
    var progGainAmp = '4096' // see index.js for allowed values for your chip  
    ADS.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, (err, data) => {   
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
    var channel = 1 //channel 0, 1, 2, or 3...  
    var samplesPerSecond = '860' // see index.js for allowed values for your chip  
    var progGainAmp = '6144' // see index.js for allowed values for your chip  
    ADS.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, (err, data) => {   
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

const db = new PouchDB('thesis-data-demo3')
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
    console.log(`Vraw: ${Vraw}`)
    Iraw = await getIraw()
    console.log(`Iraw: ${Iraw}`)
    Vout = Vraw * 5.030265596 / 1000
    Iout = (Iraw - 2590) * 0.002322580645 / 0.1
    console.log(`Vout: ${Vout}`)
    console.log(`Iout: ${Iout}`)
  } catch (err) {
    console.log(err)
    Vout = 0
    Iout = 0
  }
  var { temperature, humidity } = await DHT.read(22, 4)

  db.put({
    _id: new Date().toJSON(),
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
  db.allDocs({ include_docs: true, descending: true }).then((result) => {
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
