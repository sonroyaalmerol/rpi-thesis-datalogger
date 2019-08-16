// required libraries
const AsyncPolling = require('async-polling')
const DHT = require('node-dht-sensor').promises
var ads1x15 = require('node-ads1x15')
var ADS = new ads1x15(1)
var database = require("./db")


// user-defined functions for getting Vraw and Iraw
const getVraw = () => {
  return new Promise((resolve, reject) => {
    var channel = 0 //channel 0, 1, 2, or 3
    var samplesPerSecond = '250' // Samples per second 
    var progGainAmp = '4096' // Programmable Gain Amplifier (PGA)
    ADS.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, (err, data) => {   
      if (err) {
        reject(err) // error occured!
      }
      // if you made it here, then the data object contains your reading! 
      resolve(data) // return data gathered from sensor
    })
  })
}

const getIraw = () => {
  return new Promise((resolve, reject) => {
    var channel = 1 //channel 0, 1, 2, or 3
    var samplesPerSecond = '250' // Samples per second  
    var progGainAmp = '6144' // Programmable Gain Amplifier (PGA)  
    ADS.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, (err, data) => {   
      if (err) {  
        reject(err) // error occured!
      }
      // if you made it here, then the data object contains your reading!  
      resolve(data) // return data gathered from sensor
    })
  })
}
//*/

// define asynchronous function for continuous checking for data using sensor
var poll = AsyncPolling(async (end) => {
  var Vraw, Iraw, Vout, Iout, humidity, temperature
  try {
    Vraw = await getVraw() // use getVraw function defined above
    //Vraw = 0 // only used for debugging
    console.log(`Vraw: ${Vraw}`)
    Iraw = await getIraw() // use getIraw function defined above
    //Iraw = 0 // only used for debugging
    console.log(`Iraw: ${Iraw}`)
    Vout = Vraw * 5.030265596 / 1000 // calculate Vout using Vraw value
    Iout = (Iraw - 2590) * 0.002322580645 / 0.1 // calculate Iout using Iraw value
    console.log(`Vout: ${Vout}`)
    console.log(`Iout: ${Iout}`)
  } catch (err) {
    // if error, exit program
    console.log(err)
    process.exit()
  }
  try {
    var { temperature, humidity } = await DHT.read(22, 4) // read temperature and humidity from DHT22 sensor
    //var temperature = 0; var humidity = 0 // only used for debugging
  } catch (err) {
    // if error, exit program
    console.log(err)
    process.exit()
  }
  try {
    // upload data gathered to database
    await database.db.put({
      _id: new Date().toJSON(),
      timestamp: new Date(),
      temperature: temperature.toFixed(1),
      humidity: humidity.toFixed(1),
      voltage: Vout,
      current: Iout
    })
  } catch (err) {
    console.log(err)
  }
  // notify the polling when that the job is done
  end()
  // This will schedule the next call which is 3 seconds after end()
}, 3000)

// error callback function for poll
poll.on('error', (error) => {
    // The polling encountered an error, handle it here.
    process.exit()
})

// start the continuous data gathering
poll.run()
