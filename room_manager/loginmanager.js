const publicIp = require('public-ip');

var database = null;
var roommanager = require('../room_manager/roommanager');
const { config } = require('process');
const { Double } = require('bson');
const tablemanager = require('../game_manager/tablemanager');
var serverip = '3.22.51.209';
var io;
var port = '10015';

exports.initdatabase = function (db) {
    database = db;
    (async () => {
        // console.log(await publicIp.v4());
        serverip = await publicIp.v4();
        console.log("serverip: ", serverip);
        //=> '46.5.41.123'
        //console.log(await publicIp.v6());
        //=> 'fe80::200:f8ff:fe21:67cf'
    })();
};

exports.setsocketio = function (socketio) {
    io = socketio;
};
exports.CheckVersionCode = function (socket) {
    let emitdata = { result: '5.8' };
    socket.emit('CHECK_VERSION_CODE_RESULT', emitdata);
}
exports.LogIn = function (socket, userInfo) {
    if (userInfo.version == null || userInfo.version != '5.8') {
        let emitdata = { result: 'failed' };
        socket.emit('GET_LOGIN_RESULT', emitdata);
    }
    else {
        var collection = database.collection('User_Data');
        var query = { username: userInfo.username, facebook_id: userInfo.facebook_id };
        collection.findOne(query, function (err, result) {
            if (err)
                console.log("error13", err);
            else {
                if (result == null) {
                    let emitdata = { result: 'failed' };
                    socket.emit('GET_LOGIN_RESULT', emitdata);
                }
                else {
                    if (result.connect != "") {
                        let emitdata = { result: 'failed' };
                        socket.emit('GET_LOGIN_RESULT', emitdata);
                    }
                    else if (result.status == 1) {
                        let emitdata = { result: 'failed' };
                        socket.emit('GET_LOGIN_RESULT', emitdata);
                    }
                    else {
                        collection.updateOne(query, { $set: { connect: socket.id } }, function (err) {
                            if (err) throw err;
                        });
                        console.log('- User: ', result.username, ' has logged in');
                        socket.username = result.userid;
                        socket.emit('GET_LOGIN_RESULT', { result: 'success', data: result });

                        setTimeout(() => {
                            let collection = database.collection('User_Data');
                            collection.find().toArray(function (err, docs) {
                                if (!err) {
                                    if (docs.length > 0) {
                                        let count = 0;
                                        for (let i = 0; i < docs.length; i++) {
                                            const element = docs[i];
                                            if (element.connect != "")
                                                count++;
                                        }
                                        console.log("--------------- online_users : ", count);
                                        io.sockets.emit("ONLINE_USERS", { count: count });
                                    }
                                }
                            });
                        }, 1000);
                    }
                }
            }
        });
    }
}
function makeRandom(min, max) {
    var RandVal = Math.floor(Math.random() * (max - min + 1)) + min;
    return RandVal;
}
exports.SignUp = function (socket, data) {
    if (data.version == null || data.version != '5.8') {
        socket.emit('GET_REGISTER_RESULT', { result: 'failed' });
    }
    else {
        let collection = database.collection('User_Data');
        collection.find().toArray(function (err, docs) {
            if (err) {
                throw err;
            } else {
                let randomnum1 = '' + Math.floor(100000 + Math.random() * 900000);
                let randomnum2 = '' + Math.floor(100000 + Math.random() * 900000);
                let randomnum = randomnum1 + randomnum2;
                while (docs.filter(doc => doc.userid == randomnum && doc.username.includes(randomnum2)).length > 0) {
                    randomnum2 -= 1;
                    randomnum = randomnum1 + randomnum2;
                }
                let name = 'Guest' + randomnum2;
                var referralCode = '' + Math.floor(100000 + Math.random() * 900000);
                if (data.signtype == 'facebook') {
                    name = data.username;
                }

                let best_winning_hand = { cards: [], hand: '', handval: 0.0 };

                let user_data = {
                    username: name,
                    userid: randomnum,
                    password: "",
                    photo: '',
                    photo_index: makeRandom(1, 25),
                    photo_type: 0, // normal photo (1: facebook photo),
                    facebook_id: data.facebook_id,
                    points: 2000000000,
                    level: 1,
                    archivement: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    hands_played: 0,
                    hands_won: 0,
                    biggest_pot_won: 0,
                    best_winning_hand: best_winning_hand,
                    win_percent_holdem: 0,
                    win_percent_spin: 0,
                    tour_won: 0,
                    likes: 0,
                    buddies: 0,
                    friends: [],
                    recents : [],
                    referral_code: referralCode,
                    referral_count: 0,
                    referral_users: [],
                    created_date: new Date(),
                    spin_date: new Date(),
                    dailyReward_date: new Date(),
                    messages: [],
                    status: 0,
                    connected_room: -1,
                    connect: socket.id
                };

                collection.insertOne(user_data);
                console.log("- New user: " + name + " has Registered.");
                socket.username = randomnum;
                socket.emit('GET_REGISTER_RESULT', { result: 'success', data: user_data });
                setTimeout(() => {
                    let collection = database.collection('User_Data');
                    collection.find().toArray(function (err, docs) {
                        if (!err) {
                            if (docs.length > 0) {
                                let count = 0;
                                for (let i = 0; i < docs.length; i++) {
                                    const element = docs[i];
                                    if (element.connect != "")
                                        count++;
                                }
                                console.log("--------------- online_users : ", count);
                                io.sockets.emit("ONLINE_USERS", { count: count });
                            }
                        }
                    });
                }, 1000);
            }
        });
    }
}
exports.Valid_Name = function (socket, data) {
    var collection = database.collection('User_Data');
    collection.find().toArray(function (err, docs) {
        if (err) {
            throw err;
        }
        else {
            if (docs.length > 0) {
                const checkUser = new Promise((resolve, reject) => {
                    // let rooms_wifi = docs.filter(object => object.username == data.name);
                    let rooms_wifi;
                    rooms_wifi = docs.filter(object => object.username == data.name && object.facebook_id == data.facebook_id);
                    resolve(rooms_wifi);
                })
                checkUser.then(users => {
                    if (users.length > 0) {
                        var mydata = '{' + '"result" : "failed"' + '}';
                        socket.emit('REQ_VALID_NAME_RESULT', JSON.parse(mydata));
                    }
                    else {
                        var mydata = '{' + '"result" : "success"' + '}';
                        socket.emit('REQ_VALID_NAME_RESULT', JSON.parse(mydata));
                    }
                })

            }
            else {
                var mydata = '{' + '"result" : "success"' + '}';
                socket.emit('REQ_VALID_NAME_RESULT', JSON.parse(mydata));
            }
        }
    });
}
exports.INIT_CONNECT = function (socket, data) {
    var collection = database.collection('User_Data');
    var query = { userid: data.userid };
    collection.findOne(query, function (err, result) {
        if (err)
            console.log("error14", err);
        else {
            if (result != null) {

                collection.updateOne(query, { $set: { connect: "" } }, function (err) {
                    if (err) throw err;
                });
            }
        }
    });
}
exports.GetUserInfo = function (socket, userInfo) {
    //console.log("Get User Info ", userInfo);
    var collection = database.collection('User_Data');
    let query = { userid: userInfo.userid };
    collection.findOne(query, function (err, result) {
        if (err) {
            console.log("error15", err);
        }
        else {
            var mydata;
            if (result == null) {
                mydata = {
                    result: 'failed',
                }
            }
            else {
                mydata = {
                    result: 'success',
                    info: result
                }
            }
            //console.log(mydata);
            socket.emit('GET_USERINFO_RESULT', mydata);
        }
    });
}
exports.UpdateUserInfo_Balance = function (socket, userInfo) {

    var collection = database.collection('User_Data');
    var query = { userid: userInfo.userid };
    if (userInfo.type == "1") // slot
    {
        let bets = fixNumber(userInfo.points1);
        let gets = fixNumber(userInfo.points2);
        let isSafe = false;
        // if (gets < 0)
        //     isSafe = true;
        // else if (bets * 10 < gets)
        //     isSafe = false;
        //if (bets > 2000000000000) isSafe = false;
        if (isSafe) {
            collection.findOne(query, function (err, result) {
                if (err) console.log("error16", err);
                else {
                    let points = fixNumber(result.points) + fixNumber(gets);
                    collection.updateOne(query, { $set: { points: points } }, function (err) {
                        if (err) throw err;
                        else
                            socket.emit('REQ_UPDATE_USERINFO_BALANCE_RESULT', { result: points });
                    });
                }
            });
        }
    }
    else if (userInfo.type == "2") {
        collection.findOne(query, function (err, result) {
            if (err) console.log("error17", err);
            else {
                let points = fixNumber(userInfo.points);
                collection.updateOne(query, { $set: { points: points } }, function (err) {
                    if (err) throw err;
                    // else
                    //     socket.emit('REQ_UPDATE_USERINFO_BALANCE_RESULT', { result: points });
                });
            }
        });
    }
    else if (userInfo.type == "3") {
        collection.findOne(query, function (err, result) {
            if (err) console.log("error19", err);
            else {
                let points = result.points;
                socket.emit('REQ_UPDATE_USERINFO_BALANCE_RESULT', { result: points });
            }
        });
    }
    else if (userInfo.type == "4") {
        let userid = userInfo.userid;
        let points = userInfo.points;
        let tableId = userInfo.tableId;
        roommanager.addChipsTouserInTable(tableId, userid, points);
    }
    else if (userInfo.type == "5") {
        let userid = userInfo.userid;
        let points = userInfo.points;
        let tableId = userInfo.tableId;
        roommanager.minusChipsTouserInTable(tableId, userid, points);
    }
}
exports.Get_User_Photo = function (info, socket) {
    var collection = database.collection('User_Data');
    let url = 'https://graph.facebook.com/' + info.fb_id + '/picture?type=square&height=300&width=300';
    collection.updateOne({ userid: info.userid }, { $set: { photo: url } }, function (err) {
        if (err) throw err;
        else {
            let emitdata = {
                photo: url
            }
            socket.emit('UPLOAD_USER_PHOTO_RESULT', emitdata);
        }
    });
}
exports.Update_Photo_Index = function (info) {
    var collection = database.collection('User_Data');
    collection.updateOne({ userid: info.userid }, { $set: { photo_index: parseInt(info.photo_index) } }, function (err) {
        if (err) throw err;
    });
}
exports.Update_Photo_Type = function (info) {
    var collection = database.collection('User_Data');
    collection.updateOne({ userid: info.userid }, { $set: { photo_type: parseInt(info.photo_type) } }, function (err) {
        if (err) throw err;
    });
}
exports.Rankinginfo = function (data, socket) {
    var userInfo = '';
    var collection = database.collection('User_Data');
    collection.find().toArray(function (err, docs) {
        if (err) {
            console.log("error18", err);
            throw err;
        }
        else {
            for (var i = 0; i < docs.length; i++) {
                userInfo = userInfo + '{' +
                    '"id":"' + docs[i].userid + '",' +
                    '"connect":"' + docs[i].connect + '",' +
                    '"status":"' + docs[i].status + '",' +
                    '"username":"' + docs[i].username + '",' +
                    '"photo":"' + docs[i].photo + '",' +
                    '"photo_index":"' + docs[i].photo_index + '",' +
                    '"photo_type":"' + docs[i].photo_type + '",' +
                    '"level":"' + docs[i].level + '",' +
                    '"points":"' + docs[i].points + '"},';
            }
        }
    });
    setTimeout(function () {
        userInfo = userInfo.substring(0, userInfo.length - 1);
        userInfo = '{'
            + '"users"  : [' + userInfo;
        userInfo = userInfo + ']}';
        socket.emit('REQUEST_ALL_PLAYER_RANKINGINFO_RESULT', JSON.parse(userInfo));
    }, 500);
}
exports.updateProfile = function (socket, userInfo) {
    var collection = database.collection('User_Data');
    var query = {
        username: userInfo.username
    };

    collection.findOne(query, function (err, result) {
        if (err) {
            console.log("error20", err);
        } else {
            collection.updateOne(query, {
                $set: {
                    points: fixNumber(userInfo.balance)
                }
            }, function (err) {
                if (err) throw err;
                else {
                    roommanager.GetUserList();
                }
            });
        }
    });
}


exports.updateProfile = function (socket, userInfo) {
    let collection = database.collection('User_Data');
    let query = {
        userid: userInfo.userid
    };

    collection.findOne(query, function (err, result) {
        if (err) {
            console.log("error20", err);
        } else {
            collection.updateOne(query, {
                $set: {
                    points: fixNumber(userInfo.balance)
                }
            }, function (err) {
                if (err) throw err;
                else {
                    roommanager.GetUserList();
                }
            });
        }
    });
}
exports.Report_Message = function (socket, data) {
    let collection = database.collection('Report_Data');
    respondent_name = "";
    if (data.respondent != undefined || data.respondent != null)
        respondent_name = data.respondent;
    respondent_id = "";
    if (data.respondent_id != undefined || data.respondent_id != null)
        respondent_id = data.respondent_id;
    let insertData = {
        username: data.username,
        userid: data.userid,
        message: data.message,
        respondent: respondent_name,
        respondent_id: respondent_id,
        date: new Date()
    };

    collection.insertOne(insertData);
}
exports.panel_login = function (socket, data) {
    let collection = database.collection('User_Data');
    let totalUsers = 0;
    let onlineUsers = 0;
    collection.find().toArray(function (err, docs) {
        if (!err) {
            totalUsers = docs.length;
            if (docs.length > 0) {
                let count = 0;
                for (let i = 0; i < docs.length; i++) {
                    const element = docs[i];
                    if (element.connect != "")
                        count++;
                }
                onlineUsers = count;
            }
        }
    });
    if (data.type == "login") {
        let query = { userid: data.id, password: data.password };
        collection.findOne(query, function (err, result) {
            if (err) throw err;
            else {
                if (result == null) {
                    let emitdata = { result: 'Login failed' };
                    socket.emit('PANEL_LOGIN_RESULT', emitdata);
                }
                else {
                    if (result.status == 1) {
                        let emitdata = { result: 'You has blocked' };
                        socket.emit('PANEL_LOGIN_RESULT', emitdata);
                    }
                    else {
                        setTimeout(() => {
                            let emitdata = { result: 'Login Success', userid: data.id, password: data.password, username: result.username, total_users: totalUsers, online_users: onlineUsers };
                            socket.emit('PANEL_LOGIN_RESULT', emitdata);
                            exports.GetUserInfo(socket, { userid: result.userid });
                        }, 200);
                    }
                }
            }
        });
    }
    else if (data.type == "register") {
        let query = { userid: data.id };
        collection.findOne(query, function (err, result) {
            if (err) throw err;
            else {
                if (result == null) {
                    let emitdata = { result: 'Register failed' };
                    socket.emit('PANEL_LOGIN_RESULT', emitdata);
                }
                else {
                    collection.updateOne(query, {
                        $set: {
                            password: data.password
                        }
                    }, function (err) {
                        if (err) throw err;
                        else {
                            setTimeout(() => {
                                let emitdata = { result: 'Register Success', userid: data.id, password: data.password, username: result.username, total_users: totalUsers, online_users: onlineUsers };
                                socket.emit('PANEL_LOGIN_RESULT', emitdata);
                                exports.GetUserInfo(socket, { userid: result.userid });
                            }, 200);
                        }
                    });
                }
            }
        });

    }
}
exports.admin_panel_login = function (socket, data) {
    let collection = database.collection('User_Data');
    let totalUsers = 0;
    let onlineUsers = 0;
    collection.find().toArray(function (err, docs) {
        if (!err) {
            totalUsers = docs.length;
            if (docs.length > 0) {
                let count = 0;
                for (let i = 0; i < docs.length; i++) {
                    const element = docs[i];
                    if (element.connect != "")
                        count++;
                }
                onlineUsers = count;
            }
        }
    });

    let collection1 = database.collection('Admin_Data');
    let query = { id: data.id, password: data.password };
    collection1.findOne(query, function (err, result) {
        if (err) throw err;
        else {
            if (result != null) {
                setTimeout(() => {
                    let emitdata = { result: 'success', id: data.id, password: data.password, total_users: totalUsers, online_users: onlineUsers };
                    socket.emit('ADMIN_LOGIN_RESULT', emitdata);
                }, 200);
            }
            else {
                let emitdata = { result: 'failed' };
                socket.emit('ADMIN_LOGIN_RESULT', emitdata);
            }

        }
    });
}
exports.send_chips = function (socket, data) {
    out_points(socket, data.sender_id, data.chips);
    in_points(data.receiver_id, data.chips);
    Insert_Trans_History(data.sender, data.receiver, data.chips);
}
exports.admin_send_chips = function (socket, data) {

    in_points(data.receiver_id, data.chips);
    let collection = database.collection('Trans_History');
    let insertData = {
        sender: data.sender,
        sender_id: data.sender_id,
        receiver: data.receiver,
        receiver_id: data.receiver_id,
        chips: fixNumber(data.chips),
        type: "sent",
        date: new Date()
    };

    collection.insertOne(insertData);
}
exports.admin_remove_chips = function (socket, data) {

    out_points(socket, data.receiver_id, data.chips);
    let collection = database.collection('Trans_History');
    let insertData = {
        sender: data.sender,
        sender_id: data.sender_id,
        receiver: data.receiver,
        receiver_id: data.receiver_id,
        chips: fixNumber(data.chips),
        type: "removed",
        date: new Date()
    };

    collection.insertOne(insertData);
}
exports.trans_history = function (socket, data) {
    let collection = database.collection('Trans_History');
    let username = data.username;

    let hiss = [];
    collection.find().toArray(function (err, docs) {
        if (!err) {
            if (docs.length > 0) {
                hiss = docs.filter(function (object) {
                    return (object.sender == username || object.receiver == username)
                });
            }
        }
    });
    let Interval = setInterval(() => {
        if (hiss != null) {
            let emitdata = {
                his_data: hiss
            }
            socket.emit('TRANS_HISTORY_RESULT', emitdata);
            clearInterval(Interval);
        }
    }, 200);
}
exports.set_block = function (socket, data) {
    let collection = database.collection('User_Data');

    let query = { userid: data.userid };
    collection.updateOne(query, { $set: { status: parseInt(data.status) } }, function (err) {
        if (err) { console.log("abcd") }
        else {
            socket.emit('SET_BLOCK_RESULT', { userid: data.userid, status: parseInt(data.status) });
        }
    });
}
exports.getRports = function (socket) {
    let collection = database.collection('Report_Data');
    collection.find().toArray(function (err, docs) {
        if (!err) {
            socket.emit('GET_REPORTS_RESULT', { result: docs });
        }
    });

}
exports.send_Notice = function (socket, data) {
    io.sockets.emit('SEND_NOTICE_RESULT', data);
}
function in_points(userid, in_points) {
    var collection = database.collection('User_Data');
    var query = { userid: userid };
    collection.findOne(query, function (err, result) {
        if (err) throw "in_points:", err;
        else if (result) {
            let mypoints = fixNumber(result.points);
            in_points = fixNumber(in_points);
            mypoints = mypoints + in_points;
            collection.updateOne(query, { $set: { points: mypoints } }, function (err) {
                if (err) throw err;
                else {
                    io.sockets.emit("UPDATE_USERINFO_BALANCE_RESULT", { userid: userid, points: mypoints });
                }
            });
        }
    });
}
function out_points(socket, userid, out_points) {
    var collection = database.collection('User_Data');
    var query = { userid: userid };
    collection.findOne(query, function (err, result) {
        if (err) throw "out_points:", err;
        else if (result) {
            let mypoints = fixNumber(result.points);
            out_points = fixNumber(out_points);
            mypoints = mypoints - out_points;
            if (mypoints < 0) mypoints = 0;
            collection.updateOne(query, { $set: { points: mypoints } }, function (err) {
                if (err) throw err;
                else {
                    socket.emit('UPDATE_USERINFO_BALANCE_RESULT', { userid: userid, points: mypoints });
                }
            });
        }
    });
}
function Insert_Trans_History(sender, receiver, chips) {
    var collection = database.collection('Trans_History');
    let insertData = {
        sender: sender,
        receiver: receiver,
        chips: fixNumber(chips),
        date: new Date()
    };

    collection.insertOne(insertData);
}

function fixNumber (str) {
    let newStr = str.toString().replace(/\,/g, '');
    let _fixnumber = Number(newStr);
    return _fixnumber;
};

exports.Update_Archivement = function (socket, userInfo) {

    var collection = database.collection('User_Data');
    var query = { userid: userInfo.userid };
    
    let archMoney = fixNumber(userInfo.archivement_money);
    let archIndex = fixNumber(userInfo.archivement_index);
    collection.findOne(query, function (err, result) {
        if (err) console.log("error16", err);
        else {
            result.archivement[archIndex] = 1;
            let points = fixNumber(result.points) + fixNumber(archMoney);
            collection.updateOne(query, { $set: { points: points, archivement: result.archivement } }, function (err) {
                if (err) throw err;
                else
                    socket.emit('UPDATE_USER_ARCHIVEMENT', { result: points, arch: result.archivement });
            });
           
        }
    });
}
