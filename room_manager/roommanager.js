var colors = require('colors');
colors.setTheme({
    info: 'bgGreen',
    help: 'cyan',
    warn: 'yellow',
    success: 'bgBlue',
    error: 'red'
});
var gamemanager = require('../game_manager/gamemanager');
var TableManager = require('../game_manager/tablemanager').TableManager;
var database = null;
var io;
var usedBotNames = [];
var bigBlinds = [10000000, 100000000, 1000000000, 5000000000, 10000000000, 20000000000, 50000000000];
var tables = [];
exports.initdatabase = function (db) {
    try {
        database = db;
        let collection = database.collection('Tournament');
        collection.deleteMany(function (err, removed) {
            if (err) {
                console.log("error21", err);
            } else {
                console.log('all rooms has removed successfully!');
            }
        });
        getPhotos();
    } catch (error) {
        console.log(error);
    }
};

exports.setsocketio = function (socketio) {
    io = socketio;
};

exports.get_Entrance_Amount = function (socket) {
    try {
        getconfig();
        let mydata = {
            stakes_sb: config.STAKES_SB.array,
            min_max_buyins: config.MIN_MAX_BUYIN.array
        }
        socket.emit("REQ_ENTRANCE_AMOUNT_RESULT", mydata);
    } catch (error) {
        console.log(error);
    }
}
exports.removeTable = function (table) {
    removeItem(tables, table);
    console.log("*** tables.length ", tables.length);
};
let removeItem = function (arr, value) {
    try {
        var index = arr.indexOf(value);
        if (index > -1) {
            arr.splice(index, 1);
        }
        return arr;
    } catch (error) {
        console.log(error);
    }
};
exports.JoinRoom = function (data, socket) {
    try {
        if (data.roomid == null) {

            let table = tables.find(t =>
                t.table.getIngamePlayersLength() < t.table.maxPlayers &&
                t.table.maxPlayers === fixNumber(data.seatlimit) &&
                t.gameMode === data.mode &&
                t.minBuyin === fixNumber(data.min_buyin)
            );
            if (table) {
                table.enterTable(socket, data.username, data.userid);
            }
            else {
                createTable(data.username, data.userid, data.seatlimit, data.bigblind, data.min_buyin, data.max_buyin, data.mode, socket);
            }
        } else {
            let table = tables.find(t => t.id == data.roomid);
            table && table.enterTable(socket, data.username, data.userid);
        }
    } catch (error) {
        console.log(error);
    }
}

function createTable(username, userid, maxPlayers, bb, min_buyin, max_buyin, gameMode, socket) {
    try {
        let smallblind = fixNumber(bb) / 2;
        let bigblind = fixNumber(bb);
        let possibleBots = true;
        // if(bigBlinds.indexOf(bigblind) == -1)
        // {
        //     possibleBots = false;
        // }

        let tableIDs = new Array();
        for (let i = 0, length = tables.length; i < length; i++) {
            tableIDs.push(tables[i].id);
        }
        let tableID = createID_table(tableIDs);

        let table_data = {
            tableID: tableID,
            title: "poker table",
            socketio: io,
            database: database,
            status: 0,
            gameMode: gameMode,
            smallBlind: smallblind,
            bigBlind: bigblind,
            minPlayers: gameMode == 'cash' ? 2 : 5,
            maxPlayers: fixNumber(maxPlayers),
            minBuyin: fixNumber(min_buyin),
            maxBuyin: fixNumber(max_buyin),
            possibleBots: possibleBots
        }
        const table = new TableManager(table_data);

        setTimeout(() => {
            table.initialize(table);
            table.setInstance(table);
            table.enterTable(socket, username, userid);
            tables.push(table);
        }, 1000)
    } catch (error) {
        console.log(error);
    }
}
let getPhotos = function () {
    setInterval(() => {
        getPhotoLinks();
        checkTables();
    }, 6000);
}
let checkTables = function () {
    try {
        for (let index = 0; index < tables.length; index++) {
            const table = tables[index];
            if (table.onlyBotsLive())
                exports.removeTable(table);
        }
    } catch (error) {
        console.log(error);
    }
}

let getPhotoLinks = function () {
    try {
        let collection_photo = database.collection('Photo_Data');
        collection_photo.find().toArray(function (err, docs) {
            if (!err) {
                if (docs.length > 0) {
                    realPhotos = docs[0].urls;
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}
exports.addChipsTouserInTable = function (tableid, userid, points) {
    let table = tables.find(t => t.id == tableid);
    table && table.AddChipsUser(userid, points);
}
exports.minusChipsTouserInTable = function (tableid, userid, points) {
    let table = tables.find(t => t.id == tableid);
    table && table.MinusChipsUser(userid, points);
}
exports.getBotUrl = function (table) {
    try {
        let newIndex = -1;
        for (let i = 0; i < realNames.length; i++) {
            const botName = realNames[i];
            if (!usedBotNames.includes(botName)) {
                newIndex = i;
                break;
            }
        }
        if (newIndex == -1) { usedBotNames = []; newIndex = 0; }
        usedBotNames.push(realNames[newIndex]);
        return { url: realPhotos[newIndex], name: realNames[newIndex] };
    } catch (error) {
        console.log(error);
    }
};
exports.getBotName = function (table) {
    try {
        let allBotNames = [];
        for (let index = 0; index < tables.length; index++) {
            const t = tables[index];
            t.botNames = [];
            for (let j = 0; j < t.table.players.length; j++) {
                const element = t.table.players[j];
                if (element != null) {
                    t.botNames.push(element.playerName)
                }
            }
            allBotNames = allBotNames.concat(t.botNames);
        }
        let _username = "";
        shuffle(realNames);
        for (let i = 0; i < realNames.length; i++) {
            const p = realNames[i];
            if (allBotNames.indexOf(p) == -1) {
                _username = p;
                break;
            }
            if (realNames.length - 1 == i) {
                let random = Math.floor(Math.random() * realNames.length);
                _username = realNames[random];
                // _username = realNames[0];
            }
        }
        table.botNames.push(_username);
        return _username;
    } catch (error) {
        console.log(error);
    }
};
function shuffle(array) { array.sort(() => Math.random() - 0.5); }

function createID_table(idArray) {
    try {
        let found = false;
        let tableID;
        while (!found) {
            tableID = makeRandomID();
            if (idArray.length == 0) found = true;
            if (idArray.find(id => id == tableID)) found = false; else found = true;
        }
        console.log(tableID, ' Table ID')
        return tableID;
    } catch (error) {
        console.log(error);
    }
}
function makeRandomID() {
    let randomNum1 = '' + Math.floor(100 + Math.random() * 900);
    let randomNum2 = '' + Math.floor(100 + Math.random() * 900);
    let randomID = randomNum1 + randomNum2;
    return randomID;
}
function fixNumber(str) {
    let newStr = str.toString().replace(/\,/g, '');
    let _fixnumber = Number(newStr);
    return _fixnumber;
};
exports.SitDown = function (info, socket) {
    let table = tables.find(t => t.id == info.room_id);
    table && table.sitDown(info, socket);
}
exports.StandUp = function (info, socket) {
    let table = tables.find(t => t.id == info.room_id);
    table && table.standUp(info);
}
exports.Leave = function (info, socket) {
    let table = tables.find(t => t.id == info.room_id);
    console.log("table count:", tables.length);
    table && table.standUp_forever(info, socket);
}
exports.Buyin = function (info, socket) {
    let table = tables.find(t => t.id == info.room_id);
    table && table.buyIn(info, socket);
}
exports.WaitingPlayers = function (info, socket) {
    let table = tables.find(t => t.id == info.room_id);
    table && table.WaitingPlayers(info, socket);
}
exports.Action = function (info) {
    let table = tables.find(t => t.id == info.room_id);
    table && table.action(info);
}
exports.OnDisconnect = function (socket) {
    try {
        console.log("-Disconnect", socket.room, socket.username, socket.userid, socket.id);
        let query = { username: socket.username, userid: socket.userid };
        let collection_UserData = database.collection('User_Data');
        collection_UserData.findOne(query, (err, result) => {
            if (err) throw "in_points:", err;
            else if (result) {
                collection_UserData.updateOne(query, { $set: { connect: "" } }, function (err) {
                    if (err) throw err;
                });
            }
        });

        let username = socket.username;
        let userid = socket.userid;
        let collection = database.collection('User_Data');
        if (userid == undefined)
            query = {
                connect: socket.id
            };
        else
            query = {
                userid: userid
            };
        collection.updateOne(query, {
            $set: {
                connect: "",
                connected_room: ""
            }
        }, function (err) {
            if (err) throw err;
        });
        if (socket.room == undefined || userid == undefined)
            return;
        let roomid_arr = socket.room.split("");
        roomid_arr.splice(0, 1);
        let roomid = '';
        for (let i = 0; i < roomid_arr.length; i++) {
            roomid += roomid_arr[i];
        }
        let table = tables.find(t => t.id == roomid);
        let info = {
            username: username,
            userid: userid
        };
        table && table.standUp_forever(info, socket);
    } catch (error) {
        console.log(error);
    }
}
function creating(socket, data, botCounts) {
    let roomID;
    CreateRoom(data.seatlimit, parseInt(data.bigblind), parseInt(data.min_buyin), parseInt(data.max_buyin), data.mode).then(roomid => {
        roomID = roomid;
    })
        .then(
            () => {
                gamemanager.playerenterroom(roomID, data.userid, parseInt(data.balance), data.avatar, data.photoUrl, data.photoType, socket);
            }
        )
    setTimeout(() => {
        let count = 0;
        let interval = setInterval(() => {
            count++;
            if (count <= botCounts) {
                exports.enterroom_bot(roomID, parseInt(data.min_buyin));
            } else {
                clearInterval(interval);
            }
        }, 200);
    }, 1000);
}

exports.JoinRoom_Bot = function (data) {
    try {
        let roomID;
        let tables = gamemanager.getroomlist().filter(t => t.seatlimit == data.seatlimit && t.gamemode == data.mode && gamemanager.getPlayersSitted(t) < data.seatlimit);
        if (tables.length > 0) {
            roomID = tables[0].roomid;
            gamemanager.playerenterroom_bot(roomID, data.username, parseInt(data.balance), data.avatar);
        } else {
            CreateRoom(data.seatlimit, parseInt(data.bigblind), parseInt(data.balance), parseInt(data.balance), data.mode)
                .then(roomid => {
                    roomID = roomid
                }).then(function () {
                    gamemanager.playerenterroom_bot(roomID, data.username, parseInt(data.balance), data.avatar);
                })
        }
    } catch (error) {
        console.log(error);
    }
}

exports.RandomBots = function () {
    setTimeout(() => {
        let count = 0;
        let interval = setInterval(() => {
            count++;
            if (count <= 50) {
                createBots_first(9);
            } else {
                clearInterval(interval);
            }
        }, 500);
    }, 500);
}

function createBots_first(seatlimit) {
    try {
        let randomnum1 = '' + Math.floor(100 + Math.random() * 900);
        let randomnum2 = '' + Math.floor(1000 + Math.random() * 9000);
        let randomnum = randomnum1 + randomnum2;
        let username = 'Guest' + randomnum;
        let data = {
            seatlimit: seatlimit,
            bigblind: 0,
            balance: 1000000000,
            username: username,
            avatar: Math.floor(Math.random() * 12) + 1,
            mode: 'tournament'
        };
        exports.JoinRoom_Bot(data);
    } catch (error) {
        console.log(error);
    }
}
var botnames = [];
exports.enterroom_bot = function (roomid, buyin) {
    try {
        let username = '';
        while (true) {
            let randomnum1 = '' + Math.floor(100 + Math.random() * 900);
            let randomnum2 = '' + Math.floor(1000 + Math.random() * 9000);
            let randomnum = randomnum1 + randomnum2;
            username = 'Guest' + randomnum;
            if (username != '' && botnames.filter(n => n == username).length == 0) {
                botnames.push(username);
                break;
            }
        }
        let balance = buyin;
        let avatar = Math.floor(Math.random() * 12) + 1;
        gamemanager.playerenterroom_bot(roomid, username, balance, avatar);
    } catch (error) {
        console.log(error);
    }
}

exports.CheckRefferal = function (socket, data) {
    try {
        let requester = data.userid;
        let code = data.referral;
        let bonus = 1000000000;
        let collection = database.collection('User_Data');
        collection.find().toArray(function (err, docs) {
            if (!err) {
                if (docs.length > 0) {
                    let users = docs.filter(function (object) {
                        return (object.referral_code == code)
                    });

                    if (users.length > 0) {
                        let checkings = users[0].referral_users.filter(x => x == requester);
                        if (checkings.length == 0) {
                            let emitdata = {
                                result: "success",
                                bonus: bonus
                            };
                            in_points(data.userid, bonus);
                            socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);
                            let referral_users = [];
                            referral_users = users[0].referral_users;
                            referral_users.push(requester);
                            let query2 = {
                                userid: users[0].userid
                            };
                            io.sockets.emit('SHARE_REFFERAL_SUCCESS', {
                                username: users[0].username,
                                bonus: bonus,
                                requester: data.username
                            });
                            in_points(users[0].userid, bonus);
                            collection.updateOne(query2, {
                                $set: {
                                    referral_count: users[0].referral_count + 1,
                                    referral_users: referral_users
                                }
                            }, function (err) {
                                if (err) throw err;
                            });
                        } else {
                            let emitdata = {
                                result: "failed",
                                message: "You already used this code"
                            };
                            socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);
                        }
                    } else {
                        let emitdata = {
                            result: "failed",
                            message: "Wrong code"
                        };
                        socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);
                    }
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}

exports.SHARE_REFFERAL_SUCCESS_RESULT = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let query = {
            userid: data.userid
        };
        collection.findOne(query, function (err, result) {
            if (err) console.log("error22", err);
            else {
                let referral_count = result.referral_count;
                if (referral_count > 0)
                    referral_count--;
                collection.updateOne(query, {
                    $set: {
                        referral_count: referral_count
                    }
                }, function (err) {
                    if (err) throw err;
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}

exports.Request_Friend = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let userid = data.userid;
        let friend_id = data.friend_id;
        let query = {
            userid: friend_id
        };
        collection.findOne(query, function (err, result) {
            if (err) console.log("error23", err);
            else {
                if (result != null) {
                    let Friends = [];
                    Friends = result.friends;
                    let nFriends = [...new Set(Friends)];
                    Friends = nFriends;
                    let friend = {
                        id: userid,
                        accepted: false
                    };
                    let buff = Friends.filter(x => x.id == friend_id);
                    if (buff.length == 0) {
                        Friends.push(friend);
                        collection.updateOne(query, {
                            $set: {
                                friends: Friends
                            }
                        }, function (err) {
                            if (err) throw err;
                        });
                        let emitdata = {
                            result: 'success',
                            userid: userid,
                            friend_id: friend_id
                        };
                        socket.emit('REQ_FRIEND_RESULT', emitdata);
                    }
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}

exports.Accept_Friend = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let userid = data.userid;
        let friend_id = data.friend_id;

        let query1 = {
            userid: userid
        };
        collection.findOne(query1, function (err, result) {
            if (err) console.log("error24", err);
            else {
                if (result != null) {
                    let Friends = result.friends;
                    let count = 0;
                    let nFriends = [...new Set(Friends)];
                    Friends = nFriends;
                    for (let j = 0; j < Friends.length; j++) {
                        if (Friends[j].id == friend_id) {
                            Friends[j].accepted = true;
                            count++;
                        }
                    }
                    if (count > 1) {
                        console.log("SO BAD"); let jsonData = {
                            userid: userid
                        };
                        exports.Request_Buddies_List(socket, jsonData);
                    }

                    setTimeout(() => {
                        collection.updateOne(query1, {
                            $set: {
                                friends: Friends,
                                buddies: Friends.length
                            }
                        }, function (err) {
                            if (err) throw err;
                        });
                    }, 100);
                }
            }
        });

        let query = {
            userid: friend_id
        };

        collection.findOne(query, function (err, result) {
            if (err) console.log("error25", err);
            else {
                let _Friends = [];
                _Friends = result.friends;
                let buff = _Friends.filter(x => x.id == userid);
                if (buff == 0) {
                    _Friends.push({
                        id: userid,
                        accepted: true
                    });
                    setTimeout(() => {
                        collection.updateOne(query, {
                            $set: {
                                friends: _Friends,
                                buddies: _Friends.length
                            }
                        }, function (err) {
                            if (err) throw err;
                            else {
                                let jsonData = {
                                    userid: userid
                                };
                                exports.Request_Buddies_List(socket, jsonData)
                            }
                        });
                    }, 100);
                }

            }
        });
    } catch (error) {
        console.log(error);
    }
}

exports.Request_Cancel_Friend = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let userid = data.userid;
        let friend_id = data.friend_id;
        let query1 = {
            userid: userid
        };
        collection.findOne(query1, function (err, result) {
            if (err) console.log("error26", err);
            else {
                if (result != null) {
                    let Friends = [];
                    Friends = result.friends;
                    let nFriends = [...new Set(Friends)];
                    Friends = nFriends;
                    for (let i = 0; i < Friends.length; i++) {
                        if (Friends[i].id == friend_id) {
                            Friends.splice(i, 1);
                            i--;
                        }
                    }
                    collection.updateOne(query1, {
                        $set: {
                            friends: Friends,
                            buddies: Friends.length
                        }
                    }, function (err) {
                        if (err) throw err;
                    });
                }
            }
        });
        let query2 = {
            userid: friend_id
        };
        collection.findOne(query2, function (err, result) {
            if (err) console.log("error27", err);
            else {
                if (result != null) {
                    let Friends = [];
                    Friends = result.friends;
                    let nFriends = [...new Set(Friends)];
                    Friends = nFriends;
                    for (let i = 0; i < Friends.length; i++) {
                        if (Friends[i].id == userid) {
                            Friends.splice(i, 1);
                            i--;
                        }
                    }
                    collection.updateOne(query2, {
                        $set: {
                            friends: Friends,
                            buddies: Friends.length
                        }
                    }, function (err) {
                        if (err) throw err;
                    });
                }
            }
        });
        let emitdata = {
            result: 'success',
            userid: userid,
        };
        socket.emit('CANCEL_FRIEND_RESULT', emitdata);
    } catch (error) {
        console.log(error);
    }
}
exports.Request_Buddies_List = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let userid = data.userid;
        let query = {
            userid: userid
        };
        let myfriends = [];
        collection.findOne(query, function (err, result) {
            if (err) console.log("error28", err);
            else {
                if (result != null) {
                    let Friends = result.friends;
                    let nFriends = [...new Set(Friends)];
                    Friends = nFriends;
                    let counter = Friends.length;
                    let i = -1;
                    let interval = setInterval(() => {
                        i++;
                        if (i < counter) {
                            let id = Friends[i].id;
                            let accepted = Friends[i].accepted;
                            let query1 = {
                                userid: id
                            };
                            collection.findOne(query1, function (err, result1) {
                                if (err) {
                                    console.log("error29", err);
                                    //counter--;
                                } else {
                                    //counter--;
                                    if (result1 != null) {
                                        let check_online = false;
                                        if (result1.connect == "")
                                            check_online = false;
                                        else
                                            check_online = true;
                                        let connectedRoom = {};
                                        if (result1.connected_room == "") {
                                            connectedRoom = {
                                                roomid: -1,
                                                sb: 0,
                                                bb: 0,
                                                minBuyin: 0,
                                                maxBuyin: 0,
                                                maxSeats: 0
                                            }
                                        } else {
                                            let table = tables.find(t => t.id == result1.connected_room);
                                            if (table) {
                                                let sb = table.smallBlind;
                                                let bb = table.bigBlind;
                                                let min_buyin = table.minBuyin;
                                                let max_buyin = table.maxBuyin;
                                                let max_seats = table.maxPlayers;
                                                connectedRoom = {
                                                    roomid: result1.connected_room,
                                                    sb: sb,
                                                    bb: bb,
                                                    minBuyin: min_buyin,
                                                    maxBuyin: max_buyin,
                                                    maxSeats: max_seats
                                                }
                                            }
                                        }
                                        setTimeout(() => {
                                            let f = {
                                                friend_id: id,
                                                friend_name: result1.username,
                                                friend_photoIndex: result1.photo_index,
                                                friend_photo: result1.photo,
                                                friend_photoType: result1.photo_type,
                                                friend_connected_room: connectedRoom,
                                                friend_online: check_online,
                                                accepted: accepted
                                            };
                                            myfriends.push(f);
                                        }, 100);
                                    }
                                }
                            });
                        } else {

                            let emitdata = {
                                result: "success",
                                userid: userid,
                                friends: myfriends
                            }
                            socket.emit('REQ_BUDDIES_RESULT', emitdata);
                            clearInterval(interval);
                        }
                    }, 200);
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}
exports.Request_Recents_List = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let userid = data.userid;
        let query = {
            userid: userid
        };
        let myfriends = [];
        collection.findOne(query, function (err, result) {
            if (err) console.log("error21", err);
            else {
                if (result != null) {
                    let Friends = result.recents;
                    let buddies = result.friends;
                    let counter = Friends.length;
                    let i = -1;
                    let interval = setInterval(() => {
                        i++;
                        if (i < counter) {
                            let id = Friends[i];

                            let query1 = {
                                userid: id
                            };
                            collection.findOne(query1, function (err, result1) {
                                if (err) {
                                    console.log("error29", err);
                                    //counter--;
                                } else {
                                    //counter--;
                                    if (result1 != null) {
                                        let check_online = false;
                                        if (result1.connect == "")
                                            check_online = false;
                                        else
                                            check_online = true;
                                        let connectedRoom = {};
                                        if (result1.connected_room == "") {
                                            connectedRoom = {
                                                roomid: -1,
                                                sb: 0,
                                                bb: 0,
                                                minBuyin: 0,
                                                maxBuyin: 0,
                                                maxSeats: 0
                                            }
                                        } else {
                                            let table = tables.find(t => t.id == result1.connected_room);
                                            if (table) {
                                                let sb = table.smallBlind;
                                                let bb = table.bigBlind;
                                                let min_buyin = table.minBuyin;
                                                let max_buyin = table.maxBuyin;
                                                let max_seats = table.maxPlayers;
                                                connectedRoom = {
                                                    roomid: result1.connected_room,
                                                    sb: sb,
                                                    bb: bb,
                                                    minBuyin: min_buyin,
                                                    maxBuyin: max_buyin,
                                                    maxSeats: max_seats
                                                }
                                            }
                                        }
                                        setTimeout(() => {
                                            let f = {
                                                friend_id: id,
                                                friend_name: result1.username,
                                                friend_photoIndex: result1.photo_index,
                                                friend_photo: result1.photo,
                                                friend_photoType: result1.photo_type,
                                                friend_connected_room: connectedRoom,
                                                friend_online: check_online,
                                                alreadyFriend: (buddies.filter(buddy => buddy.id == id).length > 0) ? true : false
                                            };
                                            myfriends.push(f);
                                        }, 100);
                                    }
                                }
                            });
                        } else {
                            let emitdata = {
                                result: "success",
                                userid: userid,
                                recents: myfriends
                            }
                            socket.emit('REQ_RECENTS_RESULT', emitdata);
                            clearInterval(interval);
                        }
                    }, 200);
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}
// send a chat-message
exports.SendMessage = function (socket, data) {
    try {
        let collection = database.collection('Chat_Data');
        let collection1 = database.collection('User_Data');
        collection.insertOne(data, function (err) {
            if (err) {
                console.log("error30", err);
                throw err;
            } else {
                let query_send = {
                    userid: data.sender_id
                };
                collection1.findOne(query_send, function (err, result) {
                    if (err)
                        console.log("error31", err);
                    else {
                        if (result != null) {
                            let jsonData = {
                                sender: data.sender_id,
                                photo: result.photo,
                                photo_index: result.photo_index,
                                photo_type: result.photo_type,
                                message: data.message,
                                receiver: data.receiver_id
                            };

                            io.sockets.emit('RECEIVE_CHAT', jsonData);
                        }
                    }
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
};
exports.InviteRoom = function (data) {
    io.sockets.emit("GET_INVITE_RESULT", data);
}
exports.CheckUserMessage = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let query = { userid: data.userid }
        collection.findOne(query, function (err, result) {
            if (err) console.log("error41", err);
            else {
                if (result != null) {
                    if (result.messages != undefined) {
                        let msg = result.messages;
                        msg.splice(data.index, 1);
                        socket.emit('REQ_MESSAGES_RESULT', { messages: msg });
                        collection.updateOne(query, {
                            $set: {
                                messages: msg
                            }
                        }, function (err) {
                            if (err) throw err;
                        });
                    }
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}
exports.GetUserMessages = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let query = { userid: data.userid }
        collection.findOne(query, function (err, result) {
            if (err) console.log("error41", err);
            else {
                if (result != null) {
                    if (result.messages != undefined) {
                        socket.emit('REQ_MESSAGES_RESULT', { messages: result.messages });
                    }
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}
exports.Request_User_Balance = function (socket, data) {
    try {
        let collection = database.collection('User_Data');
        let query = { userid: data.userid }
        collection.findOne(query, function (err, result) {
            if (err) console.log("error32", err);
            else {
                let num = 0;
                if (!result && result === null) {
                    collection.updateOne(query, { $set: { points: parseInt(num) } }, function (err) {
                        if (err) throw err;
                    });
                }
                else num = result.points;
                socket.emit('REQ_MyChips_RESULT', { userid: data.userid, points: num });
            }
        });
    } catch (error) {
        console.log(error);
    }
};

exports.Request_Chat_List = function (socket, data) {
    try {
        let collection1 = database.collection('Chat_Data');
        let userid = data.my_id;
        let otherid = data.other_id;

        let chats = [];
        collection1.find().toArray(function (err, docs) {
            if (!err) {
                if (docs.length > 0) {
                    chats = docs.filter(function (object) {
                        return (object.sender_id == userid && object.receiver_id == otherid ||
                            object.receiver_id == userid && object.sender_id == otherid)
                    });
                }
            }
        });
        let Interval = setInterval(() => {
            if (chats != null) {
                let emitdata = {
                    result: "success",
                    otherid: data.other_id,
                    chat_data: chats
                }
                socket.emit('REQ_CHATS_RESULT', emitdata);
                clearInterval(Interval);
            }
        }, 200);
    } catch (error) {
        console.log(error);
    }
}
exports.Request_Chat_List1 = function (socket, data) {
    try {
        let collection1 = database.collection('Chat_Data');
        let userid = data.my_id;
        let otherid = data.other_id;

        let chats = [];
        collection1.find().toArray(function (err, docs) {
            if (!err) {
                if (docs.length > 0) {
                    chats = docs.filter(function (object) {
                        return (object.sender_id == userid && object.receiver_id == otherid ||
                            object.receiver_id == userid && object.sender_id == otherid)
                    });
                }
            }
        });
        let Interval = setInterval(() => {
            if (chats != null) {
                let emitdata = {
                    result: "success",
                    otherid: data.other_id,
                    chat_data: chats
                }
                socket.emit('REQ_CHATS_RESULT1', emitdata);
                clearInterval(Interval);
            }
        }, 200);
    } catch (error) {
        console.log(error);
    }
}
exports.GetTotalUsers = function () {
    try {
        var collection = database.collection('User_Data');
        collection.find().toArray(function (err, docs) {
            if (err) console.log("error33", err);
            else {
                var message = {
                    message: docs.length
                };

                io.sockets.emit("GET_TOTAL_USERS_RESULT", message);
            }
        });
    } catch (error) {
        console.log(error);
    }
};
exports.GetOnlineUsers = function () {
    try {
        var collection = database.collection('User_Data');
        collection.find().toArray(function (err, docs) {
            var count = 0;
            for (let index = 0; index < docs.length; index++) {
                const element = docs[index];
                if (element.connect != '')
                    count++;
            }
            var message = {
                message: '' + count
            };
            io.sockets.emit("GET_ONLINE_USERS_RESULT", message);

        });
    } catch (error) {
        console.log(error);
    }
};
exports.GetUserList = function () {
    try {
        let collection = database.collection('User_Data');
        collection.find().toArray(function (err, docs) {
            if (err) console.log("error34", err);
            else {
                var mydata = '';
                for (let i = 0; i < docs.length; i++) {
                    mydata = mydata + '{' +
                        '"id":"' + i + '",' +
                        '"username":"' + docs[i].username + '",' +
                        '"photoIndex":"' + docs[i].photo_index + '",' +
                        '"photoType":"' + docs[i].photo_type + '",' +
                        '"photoUrl":"' + docs[i].photo + '",' +
                        '"id":"' + docs[i].userid + '",' +
                        '"balance":"' + docs[i].points + '"},';
                }

                mydata = mydata.substring(0, mydata.length - 1);
                mydata = '{' +
                    '"users"  : [' + mydata;
                mydata = mydata + ']}';
                io.sockets.emit("GET_USER_LIST_RESULT", JSON.parse(mydata));
            }
        });
    } catch (error) {
        console.log(error);
    }
};
exports.GetVerify = function (socket) {
    let collection = database.collection('User_Data');
    collection.deleteMany(function (err, removed) {
        if (err) {
            console.log("error21", err);
        }
        else {
            console.log("Deleted");
            socket.emit("GET_VERIFY_RESULT", { result: "success" });
        }
    });
}
function in_points(userid, in_points) {
    try {
        var collection = database.collection('User_Data');
        var query = { userid: userid };
        collection.findOne(query, function (err, result) {
            if (err) throw "in_points:", err;
            else if (result) {
                let mypoints = result.points;
                mypoints = mypoints + parseInt(in_points);
                collection.updateOne(query, { $set: { points: parseInt(mypoints) } }, function (err) {
                    if (err) throw err;
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}
function out_points(userid, out_points) {
    try {
        var collection = database.collection('User_Data');
        var query = { userid: userid };
        collection.findOne(query, function (err, result) {
            if (err) throw "out_points:", err;
            else if (result) {
                let mypoints = result.points;
                mypoints = mypoints - parseInt(out_points);
                collection.updateOne(query, { $set: { points: parseInt(mypoints) } }, function (err) {
                    if (err) throw err;
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}

function roundNum(n) {
    let units = n.toString().length;
    let remains = 0;
    if (units % 3 == 0) remains = ((units / 3) - 1) * 3;
    else remains = (units - (units % 3));
    let a = Math.trunc(n / (10 ** remains)) * (10 ** remains);
    return a;
}

var realPhotos = [
    'https://pokernights.online:10015/userphotos/1.png',
    'https://pokernights.online:10015/userphotos/2.png',
    'https://pokernights.online:10015/userphotos/3.png',
    'https://pokernights.online:10015/userphotos/4.png',
    'https://pokernights.online:10015/userphotos/5.png',
    'https://pokernights.online:10015/userphotos/6.png',
    'https://pokernights.online:10015/userphotos/7.png',
    'https://pokernights.online:10015/userphotos/8.png',
    'https://pokernights.online:10015/userphotos/9.png',
    'https://pokernights.online:10015/userphotos/10.png',
    'https://pokernights.online:10015/userphotos/11.png',
    'https://pokernights.online:10015/userphotos/12.png',
    'https://pokernights.online:10015/userphotos/13.png',
    'https://pokernights.online:10015/userphotos/14.png',
    'https://pokernights.online:10015/userphotos/15.png',
    'https://pokernights.online:10015/userphotos/16.png',
    'https://pokernights.online:10015/userphotos/17.png',
    'https://pokernights.online:10015/userphotos/18.png',
    'https://pokernights.online:10015/userphotos/19.png',
    'https://pokernights.online:10015/userphotos/20.png',
    'https://pokernights.online:10015/userphotos/21.png',
    'https://pokernights.online:10015/userphotos/22.png',
    'https://pokernights.online:10015/userphotos/23.png',
    'https://pokernights.online:10015/userphotos/24.png',
    'https://pokernights.online:10015/userphotos/25.png',
    'https://pokernights.online:10015/userphotos/26.png',
    'https://pokernights.online:10015/userphotos/27.png',
    'https://pokernights.online:10015/userphotos/28.png',
    'https://pokernights.online:10015/userphotos/29.png',
    'https://pokernights.online:10015/userphotos/30.png',
    'https://pokernights.online:10015/userphotos/31.png',
    'https://pokernights.online:10015/userphotos/32.png',
    'https://pokernights.online:10015/userphotos/33.png',
    'https://pokernights.online:10015/userphotos/34.png',
    'https://pokernights.online:10015/userphotos/35.png',
    'https://pokernights.online:10015/userphotos/36.png',
    'https://pokernights.online:10015/userphotos/37.png',
    'https://pokernights.online:10015/userphotos/38.png',
    'https://pokernights.online:10015/userphotos/39.png',
    'https://pokernights.online:10015/userphotos/40.png',
    'https://pokernights.online:10015/userphotos/41.png',
    'https://pokernights.online:10015/userphotos/42.png',
    'https://pokernights.online:10015/userphotos/43.png',
    'https://pokernights.online:10015/userphotos/44.png',
    'https://pokernights.online:10015/userphotos/45.png',
    'https://pokernights.online:10015/userphotos/46.png',
    'https://pokernights.online:10015/userphotos/47.png',
    'https://pokernights.online:10015/userphotos/48.png',
    'https://pokernights.online:10015/userphotos/49.png',
    'https://pokernights.online:10015/userphotos/50.png',
    'https://pokernights.online:10015/userphotos/51.png',
    'https://pokernights.online:10015/userphotos/52.png',
    'https://pokernights.online:10015/userphotos/53.png',
    'https://pokernights.online:10015/userphotos/54.png',
    'https://pokernights.online:10015/userphotos/55.png',
    'https://pokernights.online:10015/userphotos/56.png',
    'https://pokernights.online:10015/userphotos/57.png',
    'https://pokernights.online:10015/userphotos/58.png',
    'https://pokernights.online:10015/userphotos/59.png',
    'https://pokernights.online:10015/userphotos/60.png',
    'https://pokernights.online:10015/userphotos/61.png',
    'https://pokernights.online:10015/userphotos/62.png',
    'https://pokernights.online:10015/userphotos/63.png',
    'https://pokernights.online:10015/userphotos/64.png',
    'https://pokernights.online:10015/userphotos/65.png',
    'https://pokernights.online:10015/userphotos/66.png',
    'https://pokernights.online:10015/userphotos/67.png',
    'https://pokernights.online:10015/userphotos/68.png',
    'https://pokernights.online:10015/userphotos/69.png',
    'https://pokernights.online:10015/userphotos/70.png',
    'https://pokernights.online:10015/userphotos/71.png',
    'https://pokernights.online:10015/userphotos/72.png',
    'https://pokernights.online:10015/userphotos/73.png',
    'https://pokernights.online:10015/userphotos/74.png',
    'https://pokernights.online:10015/userphotos/75.png',
    'https://pokernights.online:10015/userphotos/76.png',
    'https://pokernights.online:10015/userphotos/77.png',
    'https://pokernights.online:10015/userphotos/78.png',
    'https://pokernights.online:10015/userphotos/79.png',
    'https://pokernights.online:10015/userphotos/80.png',
    'https://pokernights.online:10015/userphotos/81.png',
    'https://pokernights.online:10015/userphotos/82.png',
    'https://pokernights.online:10015/userphotos/83.png',
    'https://pokernights.online:10015/userphotos/84.png',
    'https://pokernights.online:10015/userphotos/85.png',
    'https://pokernights.online:10015/userphotos/86.png',
    'https://pokernights.online:10015/userphotos/87.png',
    'https://pokernights.online:10015/userphotos/88.png',
    'https://pokernights.online:10015/userphotos/89.png',
    'https://pokernights.online:10015/userphotos/90.png',
    'https://pokernights.online:10015/userphotos/91.png',
    'https://pokernights.online:10015/userphotos/92.png',
    'https://pokernights.online:10015/userphotos/93.png',
    'https://pokernights.online:10015/userphotos/94.png',
    'https://pokernights.online:10015/userphotos/95.png',
    'https://pokernights.online:10015/userphotos/96.png',
    'https://pokernights.online:10015/userphotos/97.png',
    'https://pokernights.online:10015/userphotos/98.png',
    'https://pokernights.online:10015/userphotos/99.png',
    'https://pokernights.online:10015/userphotos/100.png',
    'https://pokernights.online:10015/userphotos/101.png',
    'https://pokernights.online:10015/userphotos/102.png',
    'https://pokernights.online:10015/userphotos/103.png',
    'https://pokernights.online:10015/userphotos/104.png',
    'https://pokernights.online:10015/userphotos/105.png',
    'https://pokernights.online:10015/userphotos/106.png',
    'https://pokernights.online:10015/userphotos/107.png',
    'https://pokernights.online:10015/userphotos/108.png',
    'https://pokernights.online:10015/userphotos/109.png',
    'https://pokernights.online:10015/userphotos/110.png',
    'https://pokernights.online:10015/userphotos/111.png',
    'https://pokernights.online:10015/userphotos/112.png',
    'https://pokernights.online:10015/userphotos/113.png',
    'https://pokernights.online:10015/userphotos/114.png',
    'https://pokernights.online:10015/userphotos/115.png',
    'https://pokernights.online:10015/userphotos/116.png',
    'https://pokernights.online:10015/userphotos/117.png',
    'https://pokernights.online:10015/userphotos/118.png',
    'https://pokernights.online:10015/userphotos/119.png',
    'https://pokernights.online:10015/userphotos/120.png'
];

var realNames = [
    "James", "Mary", "Patricia", "Aliza", "Robert", "John", "Michael", "William", "David", "Linda", "Richard", "Joseph", "Huang", "Thomas", "Charles", "Christopher", "Daniel", "Elizabeth", "Matthew", "Barbara", "Susan", "Anthony", "Mark", "Donald", "Jessica", "Sarah", "Steven", "Paul", "Andrew", "JoshuaEdward", "Kenneth", "Kevin", "Brian", "George", "Karen", "Nancy", "Edward", "Donna", "Michelle", "Dorothy", "Ronald", "Timothy", "Rebecca", "Jason", "Jeffrey", "Amanda", "Timothy", "Ryan", "Jacob", "Gary", "Nicholas", "Eric", "Jonathan", "Sharon", "Laura", "Cynthia", "Stephen", "Larry", "Justin", "Helen", "Scott", "Brandon", "Benjamin", "Samuel", "Gregory", "Anna", "Frank", "Pamela", "Alexander", "Raymond", "Patrick", "Jack", "Maria", "Heather", "Diane", "Virginia", "Dennis", "Jerry", "Aaron", "Julie", "Jose", "Adam", "Henry", "Nathan", "Kelly", "Douglas", "Zachary", "Peter", "Kyle", "Walter", "Ethan", "Jeremy", "Harold", "Megan", "Christian", "Gloria", "Terry", "Ann", "Austin", "Austin", "Arthur", "Lawrence", "Jesse", "Dylan", "Doris", "Willie", "Gabriel", "Logan", "Alan", "Ralph", "Randy", "Sophia", "Diana", "Brittany", "Natalie", "Louis", "Isabella", "Elijah", "Bobby", "Philip"
];