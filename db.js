const PouchDB = require("pouchdb")
PouchDB.plugin(require('pouchdb-find'))

const db = new PouchDB('http://admin:admin123@127.0.0.1:5984/thesis-data')
const lcoe = new PouchDB('http://admin:admin123@127.0.0.1:5984/lcoe-data')
const err = new PouchDB('http://admin:admin123@127.0.0.1:5984/errors')
const settings = new PouchDB('http://admin:admin123@127.0.0.1:5984/settings')
exports.db = db
exports.lcoe = lcoe
exports.errdb = err
exports.settings = settings
