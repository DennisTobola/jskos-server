const _ = require("lodash")
const config = require("../config")
const util = require("../lib/util")

/**
 * Provide statistics and connection status.
 */
class StatusProvider {

  constructor(db) {
    this.db = db
  }

  getStatus(req) {
    let status = {
      config: _.omit(config, ["verbosity", "port", "mongo"])
    }
    status.config.baseUrl = util.getBaseUrl(req)
    let value
    return this.db.stats().then(result => {
      value = result
      return this.db.listCollections().toArray()
    }).then(results => {
      let collectionNames = results.reduce((total, current) => {
        total.push(current.name)
        return total
      }, [])
      let promises = []
      for (let collection of collectionNames) {
        promises.push(this.db.collection(collection).stats().then(result => {
          result.name = collection
          return result
        }))
      }
      return Promise.all(promises)
    }).then(results => {
      value.collections = results
      for (let collection of value.collections) {
        _.unset(collection, "wiredTiger")
        _.unset(collection, "indexDetails")
        _.unset(collection, "indexSizes")
      }
      return value
    }).catch(error => {
      console.log("Error on /status:", error)
      return {
        ok: 0
      }
    }).then(result => Object.assign(status, result))
  }

}

module.exports = StatusProvider
