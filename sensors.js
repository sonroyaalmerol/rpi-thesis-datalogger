// Necessary Libraries

const AsyncPolling = require('async-polling')

//Library for DHT22 Sensor
const DHT = require('node-dht-sensor').promises

//Library for ADS1115 ADC
const Raspi = require('raspi')
const I2C = require('raspi-i2c').I2C
const ADS1x15 = require('raspi-kit-ads1x15')

//Library for TSL2561 Lux Sensor
const tslreq = require('@agilatech/tsl2561');
const tsl = new tslreq.Tsl2561('/dev/i2c-1', 0x39);

//Database Requirement
var database = require("./db")


// Function retrieving raw voltage and current values
const getVraw = () => {
  return new Promise((resolve, reject) => {
    Raspi.init(() => {
    
      // Init Raspi-I2c
      var i2c = new I2C();
      
      // Init the ADC
      var adc = new ADS1x15({
          i2c,                                    // i2c interface
          chip: ADS1x15.chips.IC_ADS1115,         // chip model
          address: ADS1x15.address.ADDRESS_0x48,  // i2c address on the bus
          
          // Defaults for future readings
          pga: ADS1x15.pga.PGA_4_096V,            // power-gain-amplifier range
          sps: ADS1x15.spsADS1015.SPS_250         // data rate (samples per second)
      });
      
      // Get a single-ended reading from channel-0 and display the results
      adc.readChannel(ADS1x15.channel.CHANNEL_0, (err, value, volts) => {
          if (err) {
              reject(err)
          } else {
              resolve(value)
          }
      })
    })
  })
}

const getIraw = () => {
  return new Promise((resolve, reject) => {
    Raspi.init(() => {
    
      // Init Raspi-I2c
      var i2c = new I2C();
      
      // Init the ADC
      var adc = new ADS1x15({
          i2c,                                    // i2c interface
          chip: ADS1x15.chips.IC_ADS1115,         // chip model
          address: ADS1x15.address.ADDRESS_0x48,  // i2c address on the bus
          
          // Defaults for future readings
          pga: ADS1x15.pga.PGA_6_144V,            // power-gain-amplifier range
          sps: ADS1x15.spsADS1015.SPS_250         // data rate (samples per second)
      });
      
      // Get a single-ended reading from channel-1 and display the results
      adc.readChannel(ADS1x15.channel.CHANNEL_1, (err, value, volts) => {
          if (err) {
              reject(err)
          } else {
              resolve(value)
          }
      })
    })
  })
}

const getSraw = () => {
  return new Promise((resolve, reject) => {
    Raspi.init(() => {
    
      // Init Raspi-I2c
      var i2c = new I2C();
      
      // Init the ADC
      var adc = new ADS1x15({
          i2c,                                    // i2c interface
          chip: ADS1x15.chips.IC_ADS1115,         // chip model
          address: ADS1x15.address.ADDRESS_0x48,  // i2c address on the bus
          
          // Defaults for future readings
          pga: ADS1x15.pga.PGA_6_144V,            // power-gain-amplifier range
          sps: ADS1x15.spsADS1015.SPS_250         // data rate (samples per second)
      });
      
      // Get a single-ended reading from channel-2 and display the results
      adc.readChannel(ADS1x15.channel.CHANNEL_2, (err, value, volts) => {
          if (err) {
              reject(err)
          } else {
              resolve(value)
          }
      })
    })
  })
}

// Function for reporting error to database for viewing purposes
const reportError = async (err) => {
  var errs = await database.errdb.allDocs()
  
  //Deletes previous errors if there are more than 20 logs in the error table
  if (errs.rows.length > 20) {
    var todelete = errs.rows[0]
    await database.errdb.remove(todelete.id, todelete.value.rev)
  }
  
  //Uploads error details to database
  await database.errdb.put({
    _id: new Date().toJSON(),
    timestamp: new Date(),
    error: err
  })
}

const getSettings = async (settingName) => {
  // Get settings
  var settings = await database.settings.find({ selector: { value: {$exists: true} } })
  console.log(settings)
  settings = settings.docs
  console.log(settings)
  
  var y = settings.find((x) => { return x.name == settingName })
  
  console.log(y)
  
  if (y) {
    return y.value
  } else {
    return null
  }
}

//*/

// Define asynchronous function for continuous checking for data using sensor
var poll = AsyncPolling(async (end) => {
  var Vraw, Iraw, Sraw, Vout, Iout, Sout, Power, humidity, temperature

  //Main Step A: Read Voltage and Current
  try {
    //Step 1: Gather Raw Values
    Vraw = await getVraw()        //Waits for Vraw from the getVraw() function above
    console.log(`Vraw: ${Vraw}`)
    Iraw = await getIraw()        //Waits for Iraw from the getIraw() function above
    console.log(`Iraw: ${Iraw}`)
    
    //Step 2: Calculate Actual Voltages and Current as well as Power
    Vout = Vraw * 0.632034632 / 1000
    
    if (Vout < 0) {
      Vout = 0
    }
    
    Iout = (Iraw - 13608) * 0.0001377551 / 0.1 //13180 orig
    if (Iout < 0) {
      Iout = 0
    }
    
    Power = Vout * Iout
    console.log(`Vout: ${Vout}`)
    console.log(`Iout: ${Iout}`)
    console.log(`Power: ${Power}`)
    
  } catch (err) {
    //Sub-Step: If error, report error to database then exit program
    console.log(err)
    await reportError(`ADS VI Error! (Vraw: ${Vraw}, Iraw: ${Iraw})`)
    process.exit()
  }
  
  //Main Step B: Read Temperature and Humidity from DHT22 Sensor
  try {
    var { temperature, humidity } = await DHT.read(22, 4)
  } catch (err) {
    //Sub-Step: If error, report error to database then exit program
    console.log(err)
    await reportError(`DHT Error! (Temp: ${temperature}, Humidity: ${humidity})`)
    process.exit()
  }
  
  //Main Step C: Read Lux from TSl2561 Lux Sensor
  try {
    var lux = tsl.valueAtIndexSync(0)
    console.log(`Lux: ${lux}`)
  } catch (err) {
    //Sub-Step: If error, report error to database then exit program
    console.log(err)
    await reportError(`TSL Error! (Lux: ${lux})`)
    process.exit()
  }
 
 
 
   //Main Step D: Gather Radiation from Davis 6450
   try {
    //Step 1: Gather Raw Values
    Sraw = await getSraw()        //Waits for Vraw from the getVraw() function above
    console.log(`Sraw: ${Sraw}`)
    
    //Step 2: Calculate Actual Voltages and Current as well as Power
    Sout = (Sraw * 0.100708007 / 1.67) + 0.241
    console.log(`Sout: ${Sout}`)
    
    if (Sout < 0) {
      Sout = 0
    }
    
  } catch (err) {
    //Sub-Step: If error, report error to database then exit program
    console.log(err)
    await reportError(`ADS Radiation Error! (Sraw: ${Sraw})`)
    process.exit()
  }
  //Main Step E: Calculate Efficiency Parameters
  
  //Get settings from db
  var GatSTC = await getSettings("GatSTC")
  var NOCT = await getSettings("NOCT")
  var Pmax = await getSettings("Pmax")
  var PTcoeff = await getSettings("PTcoeff")
  var Area = await getSettings("Area")
  var nPVmax = await getSettings("nPVmax")

  var nPV = Power / Pmax * 100
  if (nPV < 0) {
    nPV = 0
  }
  
  var Tcell = temperature + GatSTC * ((NOCT-20)/800)
  var Praw = Sout * Pmax / 1000
  var Ptemp = (-1 * (PTcoeff)) * Praw * (Tcell - 25)
  var Pfixed = Praw + Ptemp
    
  //Main Step F: Upload data gathered to datalogger database
  try {
    await database.db.put({
      _id: new Date().toJSON(),
      timestamp: new Date(),
      temperature: temperature.toFixed(2),
      humidity: humidity.toFixed(2),
      luminosity: lux,
      voltage: Vout.toFixed(3),
      current: Iout.toFixed(3),
      power: Power.toFixed(3),
      radiation: Sout.toFixed(3),
      nPV: nPV.toFixed(3),
      Tcell: Tcell.toFixed(3),
      Praw: Praw.toFixed(3),
      Pc: Ptemp.toFixed(3),
      Pfixed: Pfixed.toFixed(3)
    })
  } catch (err) {
    console.log(err)
  }

 
  // Notify the polling when that the job is done
  end()
  
  // This will schedule the next call which is 3 seconds after end()
}, 3000)

// Error callback function for poll in case error occures
poll.on('error', async (error) => {
    // The polling encountered an error, handle it here.
    // if error, report error to database then exit program
    await reportError(`Polling error! (${error})`)
    process.exit()
})

// start the continuous data gathering
poll.run()
