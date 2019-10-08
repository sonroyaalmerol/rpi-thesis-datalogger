// Necessary Libraries

const AsyncPolling = require('async-polling')

//Database Requirement
var database = require("./db")

const getSettings = async (settingName) => {
    // Get settings
    var settings = await database.settings.find({ selector: { value: {$exists: true} } })
    settings = settings.docs

    var y = settings.find((x) => { return x.name == settingName })

    if (y) {
        return y.value
    } else {
        return null
    }
}

const todayDate = () => {
    var x = new Date()
    x = x.setHours(0, 0, 0, 0)
    return new Date(x)
}

const today630 = () => {
    var x = new Date()
    x = x.setHours(18, 30, 0, 0)
    return new Date(x)
}

// Define asynchronous function for continuous checking for data using sensor
var poll = AsyncPolling(async (end) => {
    
    if (new Date() >= today630()) {
        var SystemCost = await getSettings("SystemCost")
        var TaxBenefits = await getSettings("TaxBenefits")
        var YearWarranty = await getSettings("YearWarranty")

        var entries = await database.db.allDocs({ include_docs: true })
        entries = entries.rows

        var dates = []
        var entriesToday = []
        var PowerSum = 0

        for (var x=0; x < entries.length; x++) {
            var entry = entries[x].doc
            var datetimeEntry = new Date(entry.timestamp)
            var dateOnly = new Date(datetimeEntry.setHours(0, 0, 0, 0)).toJSON()
            if (dates.indexOf(dateOnly) === -1) {
                if (dateOnly !== null) {
                    dates.push(dateOnly)
                }
            }
            if (new Date(dateOnly) <= new Date(todayDate())) {
                entriesToday.push(entry)
                if (entry.power) {
                    PowerSum = PowerSum + parseFloat(entry.power)
                }
            }
        }

        var NetCost = SystemCost + TaxBenefits
        var EnergyD = PowerSum*5/3600/1000/dates.length
        var EnergyY = EnergyD * 365

        var LCOE = NetCost/EnergyY/YearWarranty

        var toSubmit = {
            _id: todayDate().toJSON(),
            timestamp: new Date(),
            EnergyD,
            EnergyY,
            LCOE
        }

        try {
            await database.lcoe.put(toSubmit)
        } catch (err) {
            console.log(err)
        }
    }
    // Notify the polling when that the job is done
    end()
  
  // This will schedule the next call which is 5 minutes after end()
}, 300000)

// Error callback function for poll in case error occures
poll.on('error', async (error) => {
    // The polling encountered an error, handle it here.
    // if error, exit program
    process.exit()
})

// start the continuous data gathering
poll.run()
