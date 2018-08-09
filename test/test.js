const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const chaiHttp = require("chai-http")
chai.use(chaiHttp)
// eslint-disable-next-line no-unused-vars
const should = chai.should()
const server = require("../server")
const exec = require("child_process").exec
const _ = require("lodash")

// Hide UnhandledPromiseRejectionWarning on output
process.on("unhandledRejection", () => {})

describe("MongoDB", () => {

  it("should connect to database successfully", () => {
    return server.db.should.be.fulfilled
  })

  after(() => {
    server.db.then(db => {
      db.close()
    }).catch(() => {})
  })
})

describe("Express Server", () => {

  let clearDatabase = done => {
    // Empty database before testing
    exec("NODE_ENV=test npm run import -- -r", (err) => {
      if (err) {
        console.error("    x Error: Clearing database failed.")
      } else {
        console.log("    ✓ Cleared database")
      }
      done(err)
    })
  }

  before(clearDatabase)
  after(clearDatabase)

  describe("GET /voc", () => {

    it("should GET an empty array", done => {
      chai.request(server.app)
        .get("/voc")
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.a("array")
          res.body.length.should.be.eql(0)
          done()
        })
    })

    it("should GET one vocabulary", done => {
      // Add one vocabulary to database
      exec("NODE_ENV=test npm run import -- -t ./test/terminologies/terminologies.json", (err) => {
        if (err) {
          done(err)
          return
        }
        chai.request(server.app)
          .get("/voc")
          .end((err, res) => {
            res.should.have.status(200)
            res.body.should.be.a("array")
            res.body.length.should.be.eql(1)
            done()
          })
      })
    })

  })

  describe("GET /mappings", () => {

    it("should GET an empty array", done => {
      chai.request(server.app)
        .get("/mappings")
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.a("array")
          res.body.length.should.be.eql(0)
          done()
        })
    })

    it("should GET three mappings", done => {
      // Add mappings to database
      exec("NODE_ENV=test npm run import -- -m ./test/mappings/mapping-ddc-gnd.json", (err) => {
        if (err) {
          done(err)
          return
        }
        chai.request(server.app)
          .get("/mappings")
          .end((err, res) => {
            res.should.have.status(200)
            res.body.should.be.a("array")
            res.body.length.should.be.eql(3)
            done()
          })
      })
    })

    it("should GET one mapping with URL parameter", done => {
      chai.request(server.app)
        .get("/mappings")
        .query({
          to: "http://d-nb.info/gnd/4499720-6"
        })
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.a("array")
          res.body.length.should.be.eql(1)
          _.get(res, "body[0].from.memberChoice[0].uri").should.be.eql("http://dewey.info/class/612.112/e22/")
          done()
        })
    })

  })

  describe("GET /mappings/voc", () => {

    it("should GET appropriate results", done => {
      // Add mapping to database
      exec("NODE_ENV=test npm run import -- -r -m ./test/mappings/mappings-ddc-rvk.json", (err) => {
        if (err) {
          done(err)
          return
        }
        chai.request(server.app)
          .get("/mappings/voc")
          .end((err, res) => {
            res.should.have.status(200)
            res.body.should.be.a("array")
            res.body.length.should.be.eql(2)
            done()
          })
      })
    })

    it("should GET appropriate results with mode=and", done => {
      chai.request(server.app)
        .get("/mappings/voc")
        .query({
          from: "http://dewey.info/class/612.112/e23/",
          to: "http://rvk.uni-regensburg.de/nt/WW_8840",
          mode: "and"
        })
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.a("array")
          res.body.length.should.be.eql(2)
          let total = res.body.reduce((total, current) => {
            return total + (current.fromCount || 0) + (current.toCount || 0)
          }, 0)
          total.should.be.eql(2)
          done()
        })
    })

    it("should GET appropriate results with mode=or", done => {
      chai.request(server.app)
        .get("/mappings/voc")
        .query({
          from: "http://dewey.info/class/612.112/e23/",
          to: "http://rvk.uni-regensburg.de/nt/WW_8840",
          mode: "or"
        })
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.a("array")
          res.body.length.should.be.eql(2)
          let total = res.body.reduce((total, current) => {
            return total + (current.fromCount || 0) + (current.toCount || 0)
          }, 0)
          total.should.be.eql(8)
          done()
        })
    })

  })

})