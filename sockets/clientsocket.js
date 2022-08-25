
var events = require('events');
var eventemitter = new events.EventEmitter();
var db = require('../database/mongodatabase');
var roommanager = require('../room_manager/roommanager');
var gamemanager = require('../game_manager/gamemanager');
var loginmanager = require('../room_manager/loginmanager');
var botmanager = require('../game_manager/botmanager');
var userdatabase = require('../database/userdatabase');
var database = null;

exports.initdatabase = function () {
    db.connect(function (err) {
        if (err) {
            console.log(err);
            console.log('Unable to connect to Mongo.');
            process.exit(1);
        }
        console.log('Connected to the DB.');
        database = db.get();
        loginmanager.initdatabase(database);
        roommanager.initdatabase(database);
        gamemanager.initdatabase(database);
        userdatabase.initdatabase(database);
    });

    eventemitter.on('roomdelete', function (mydata) {
        roommanager.deleteroom(mydata);
    });
};

exports.initsocket = function (socket, io) {
    loginmanager.setsocketio(io);
    roommanager.setsocketio(io);
    gamemanager.setsocketio(io);
    // Check Version Code    
    //socket.on('message',(error)=>{console.log(error)} )
    socket.on('CHECK_VERSION_CODE', function () {
        loginmanager.CheckVersionCode(socket);
    });
    // LOGIN
    socket.on('REQ_LOGIN', function (data) {
        loginmanager.LogIn(socket, data);
    });
    // Register
    socket.on('REQ_REGISTER', function (data) {
        loginmanager.SignUp(socket, data);
    });
    socket.on('REQ_VALID_NAME', function (data) {
        loginmanager.Valid_Name(socket, data);
    });
    // upload profile_pic
    socket.on('UPLOAD_USER_PHOTO', function (data) {
        loginmanager.Get_User_Photo(data, socket);
    });
    // update photo_index
    socket.on('UDATE_PHOTO_INDEX', function (data) {
        loginmanager.Update_Photo_Index(data);
    });
    socket.on('REQ_PHOTO_TYPE', function (data) {
        loginmanager.Update_Photo_Type(data);
    });

    socket.on('REQ_ENTRANCE_AMOUNT', function () {
        roommanager.get_Entrance_Amount(socket);
    });
    socket.on('REQ_USER_INFO', function (data) {
        loginmanager.GetUserInfo(socket, data)
    });
    // Create Room
    socket.on('REQ_CREATE_ROOM', function (data) {
        roommanager.CreateRoom(socket, data);
    });
    // Join Room
    socket.on('REQ_ENTER_ROOM', function (data) {
        roommanager.JoinRoom(data, socket);
    });
    // Join Room _ID
    socket.on('REQ_ENTER_ROOM_ID', function (data) {
        roommanager.JoinRoom(data, socket);
    });
    socket.on('REQ_INVITE', function (data) {
        roommanager.InviteRoom(data);
    });
    socket.on('REQ_MESSAGES', function (data) {
        roommanager.GetUserMessages(socket, data);
    });
    socket.on('CHECKED_INVITE', function (data) {
        roommanager.CheckUserMessage(socket, data);
    });
    // Actions
    socket.on('PLAYER_ACTION', function (data) {
        roommanager.Action(data);
    });
    // Take a seat
    socket.on('REQ_TAKE_SEAT', function (data) {
        roommanager.SitDown(data, socket);
    });
    // Show cards
    socket.on('SHOW_CARDS', function (data) {
        gamemanager.ShowCards(data);
    });
    // Take a seat
    socket.on('REQ_WAIT_BB', function (data) {
        gamemanager.WaitForBB(socket, data);
    });
    // Cancel - Take a seat
    socket.on('REQ_CANCEL_TAKE_SEAT', function (data) {
        gamemanager.SitUp(socket, data);
    });
    // To view-mode
    socket.on('PLAYER_VIEW_TABLE', function (data) {
        roommanager.StandUp(data, socket);
    });
    // sitout by next hand
    socket.on('REQ_SIT_OUT', function (data) {
        gamemanager.SitOut(socket, data);
    });
    // send gift
    socket.on('REQ_GIFT', function (data) {
        gamemanager.SendGift(data);
    });

    // Buy-in
    socket.on('PLAYER_BUYIN', function (data) {
        roommanager.Buyin(data, socket);
    });
    //WAITING_PLAYERS
    socket.on('WAITING_PLAYERS', function(data) {
        roommanager.WaitingPlayers(data, socket);
    });
    // Spin
    socket.on('REQ_SPIN', function (data) {
        gamemanager.CheckSpin(socket, data);
    });
    socket.on('REQ_SPIN_SUCCESS', function (data) {
        gamemanager.SuccessSpin(socket, data);
    });
    // Chat
    socket.on('REQ_CHAT', function (data) {
        gamemanager.ChatMessage(socket, data);
    });
    //Public Chat
    socket.on('REQ_PUBLIC_CHAT', function (data) {
        gamemanager.PublicChatMessage(socket, data);
    });
    socket.on('REQ_PUBLIC_CHAT_LIST', function (data) {
        gamemanager.GetPublicChats(socket, data);
    });
    socket.on('SEND_CHAT', function (data) {
        roommanager.SendMessage(socket, data);
    });
    // Leave
    socket.on('PLAYER_LEAVE', function (data) {
        roommanager.Leave(data, socket);
        // gamemanager.PlayerLeave(socket, data);
    });
    // disconnect
    socket.on('disconnect', function () {
        roommanager.OnDisconnect(socket);
    });
    // create bot
    socket.on('CREATE_BOT', function (data) {
        botmanager.createBots(data);
    });
    // update user slot value
    socket.on('REQ_UPDATE_SLOT_VALUE', function (data) {
        loginmanager.UpdateUserSlotValue(socket, data);
    });
    
    // update user' balance
    socket.on('REQ_UPDATE_USERINFO_APP_BALANCE', function (data) {
        loginmanager.UpdateUserInfo_Balance(socket, data);
    });
    socket.on('REQUEST_ALL_PLAYER_RANKINGINFO', function (data) {
        loginmanager.Rankinginfo(data, socket);
    });
    // tournament list
    socket.on('REQ_TOUR_LIST', function (data) {
        gamemanager.getTournaments(socket, data);
    });
    // tournament register
    socket.on('REQ_TOUR_REGISTER', function (data) {
        gamemanager.regTournaments(socket, data);
    });
    socket.on('REQ_CHECK_REFFERAL', function (data) {
        roommanager.CheckRefferal(socket, data);
    });
    socket.on('SHARE_REFFERAL_SUCCESS_RESULT', function (data) {
        roommanager.SHARE_REFFERAL_SUCCESS_RESULT(socket, data);
    });
    socket.on('REQ_FRIEND', function (data) {
        roommanager.Request_Friend(socket, data);
    });
    socket.on('ACCEPT_FRIEND', function (data) {
        roommanager.Accept_Friend(socket, data);
    });
    socket.on('REQ_CANCEL_FRIEND', function (data) {
        roommanager.Request_Cancel_Friend(socket, data);
    });
    socket.on('REQ_BUDDIES', function (data) {
        roommanager.Request_Buddies_List(socket, data);
    });
    socket.on('REQ_BUDDIES1', function (data) {
        roommanager.Request_Buddies_List1(socket, data);
    });
    socket.on('REQ_RECENTS', function (data) {
        roommanager.Request_Recents_List(socket, data);
    });
    socket.on('REQ_CHATS', function (data) {
        roommanager.Request_Chat_List(socket, data);
    });
    socket.on('REQ_CHATS1', function (data) {
        roommanager.Request_Chat_List1(socket, data);
    });
    socket.on('REQ_MyChips', function (data) {
        roommanager.Request_User_Balance(socket, data);
    });
    socket.on('INIT_CONNECT', function (data) {
        loginmanager.INIT_CONNECT(socket, data);
    });
    socket.on('REPORT_MESSAGE', function (data) {
        loginmanager.Report_Message(socket, data);
    });

    socket.on('UPDATE_ARCHIVEMENT', function (data) {
        console.log('1323132')
        loginmanager.Update_Archivement(socket, data);
    });
    //------------------Vuejs Admin----------------------
    socket.on('GET_TOTAL_USERS', function () {
        roommanager.GetTotalUsers();
    });
    socket.on('GET_ONLINE_USERS', function () {
        roommanager.GetOnlineUsers();
    });
 
    socket.on('GET_USER_LIST', function () {
        roommanager.GetUserList();
    });
    socket.on('GET_VERIFY', function () {
        roommanager.GetVerify(socket);
    });
    socket.on('UPDATE_USER', function (data) {
        loginmanager.updateProfile(socket, data);
    });

    //----------------Admin & Seller Panel----------------------
    socket.on('PANEL_LOGIN', function (data) {
        loginmanager.panel_login(socket, data);
    });
    socket.on('ADMIN_LOGIN', function (data) {
        loginmanager.admin_panel_login(socket, data);
    });
    socket.on('ADMIN_REMOVE_CHAT', function (data) {
        loginmanager.admin_remove_chat(socket, data);
    });
    socket.on('ADMIN_REMOVE_ALL_CHAT', function (data) {
        loginmanager.admin_remove_all_chat(socket, data);
    });
    socket.on('SEND_CHIPS', function (data) {
        loginmanager.send_chips(socket, data);
    });
    socket.on('ADMIN_SEND_CHIPS', function (data) {
        loginmanager.admin_send_chips(socket, data);
    });
    socket.on('ADMIN_REMOVE_CHIPS', function (data) {
        loginmanager.admin_remove_chips(socket, data);
    });
    socket.on('TRANS_HISTORY', function (data) {
        loginmanager.trans_history(socket, data);
    });
    socket.on('SET_BLOCK', function (data) {
        loginmanager.set_block(socket, data);
    });
    socket.on('GET_REPORTS', function () {
        loginmanager.getRports(socket);
    });
    socket.on('SEND_NOTICE', function (data) {
        loginmanager.send_Notice(socket, data);
    });
}