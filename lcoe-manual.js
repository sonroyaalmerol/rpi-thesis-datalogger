// Necessary Libraries

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


const calculateLCOE = async (today) => {
    const todayDate = () => {
        var x = new Date(today)
        x = x.setHours(0, 0, 0, 0)
        return new Date(x)
    }

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
                if (new Date(dateOnly) <= new Date(todayDate())) {
                    dates.push(dateOnly)
                }
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

    console.log({ NetCost, EnergyY, EnergyD, PowerSum, TotalDays: dates.length })
    var toSubmit = {
        _id: todayDate().toJSON(),
        timestamp: todayDate(),
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

calculateLCOE(new Date('October 3, 2019 12:00:00')) // Change date for calculation
