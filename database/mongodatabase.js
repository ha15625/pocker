var MongoClient = require('mongodb').MongoClient;
var URL = 'mongodb+srv://nightpoker:gGRTkjrP534RhoRr@cluster0.igc5p.mongodb.net/MJDatabase';
// var URL = 'mongodb://127.0.0.1:27017/MJDatabase';
var state = {
    db: null,
};

exports.connect = function(done) {
    if (state.db)
        return done();

    MongoClient.connect(URL,{ useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
        if (err)
            return done(err);
        console.log("Mongodb connected");
        var db = client.db('MJDatabase');
        state.db = db;
        done();
    });
};

exports.get = function() {
    return state.db;
};

exports.close = function(done) {
    if (state.db) {
        state.db.close(function(err, result) {
            state.db = null;
            state.mode = null;
            done(err);
        });
    }
};