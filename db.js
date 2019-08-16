const PouchDB = require("pouchdb")
PouchDB.plugin(require('pouchdb-find'))

const db = new PouchDB('http://admin:admin123@127.0.0.1:5984/thesis-data')
const err = new PouchDB('http://admin:admin123@127.0.0.1:5984/errors')
exports.db = db
exports.errdb = err
