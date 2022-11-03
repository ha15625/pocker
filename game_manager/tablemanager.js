'use strict'
var Poker = require("poker-engine");
var Ranker = require('handranker');
var colors = require('colors');
var roommanager = require('../room_manager/roommanager');

colors.setTheme({
    info: 'bgGreen',
    help: 'cyan',
    warn: 'yellow',
    success: 'bgBlue',
    error: 'red'
});

function TableManager(param) {
    this.id = param.tableID || 0;
    this.title = param.title;
    this.io = param.socketio;
    this.database = param.database;
    this.status = param.status;
    this.gameMode = param.gameMode;
    this.smallBlind = param.smallBlind;
    this.bigBlind = param.bigBlind;
    this.minBuyin = param.minBuyin;
    this.maxBuyin = param.maxBuyin;
    this.maxPlayers = param.maxPlayers;
    this.botCount = param.possibleBots ? param.gameMode == 'cash' ? param.maxPlayers == 9 ? config.Bots.array[0] : config.Bots.array[1] : param.maxPlayers == 5 ? 4 : 0 : 0;
    this.botNames = [];
    this.botUrls = [];
    this.botIDs = [];
    this.currentTimeout = null;
    this.levelTimeout = null;
    this.breakTimeout = null;
    this.roundStartTime = null;
    this.level = 1;
    this.legalBet = 0;
    this.played = 0;
    this.startFlag = 0;
    this.totalPot = 0;
    this.mainPots = [];
    this.turn = false;
    this.isBreakTime = false;
    this.removed = false;
    this.showWinDelay = 1000;
    this.collection_UserData = this.database.collection('User_Data');
    this.maxRank_players = [];
    this.bigBlinds = [10000000, 100000000, 1000000000, 5000000000, 10000000000, 20000000000, 50000000000];
    this.timer = setTimeout(() => {
        //config.Tour_SB_W.array
    }, 300000);;
    this.hardCount = 0;
    this.table = Poker.newTable({
        minBlind: param.smallBlind,
        maxBlind: param.bigBlind,
        minPlayers: param.minPlayers,
        maxPlayers: param.maxPlayers
    }, []);
    this.players = [];
    this.instance = null;
    this.waitingPlayers = [];
    this.isRaise = false;
}
TableManager.prototype.initialize = function (tablemanager) {
    //console.log(this.table);
    this.table.on("roundDeal", function () { tablemanager.onRoundDeal() });
    this.table.on("smallBlind", function (player) { tablemanager.onSmallBlind(player) });
    this.table.on("bigBlind", function (player) { tablemanager.onBigBlind(player) });
    this.table.on("turn", function (player) { tablemanager.onTurn(player) });
    this.table.on("dealCards", function (boardCardCount, currntBets) { tablemanager.onDealCards(boardCardCount, currntBets) });
    this.table.on("roundShowdown", function (currntBets) { tablemanager.onRoundShowdown(currntBets) });
    this.table.on("win", function (winner, prize) { tablemanager.onWin(winner, prize) });
    this.table.on("gameOver", function () { tablemanager.onGameOver() });
    this.table.on("updatePlayer", function (player) { tablemanager.onUpdatePlayer(player) });
    this.table.on("returnChips", function (position, returnChip) { tablemanager.onReturnChips(position, returnChip) });
    this.table.on("Bankrupt", function (player) { tablemanager.onBankrupt(player) });
};
TableManager.prototype.setInstance = function (tablemanager) {
    this.instance = tablemanager;
}
TableManager.prototype.onRoundDeal = function () {
    this.legalBet = 0;
    this.mainPots = [];
    this.showWinDelay = 1000;
    let emitdata = {
        roomid: this.id,
        roundname: 'Deal',
        card: [],
        pot: '' + this.table.getRoundPot(),
        mainpots: this.mainPots
    };
    this.io.in('r' + this.id).emit('TABLE_ROUND', emitdata);
};
TableManager.prototype.onSmallBlind = function (player) {
    try {
        this.totalPot += this.smallBlind;
        let message = player.playerName + " posted small blind with $" + ChangeUnit(this.smallBlind)

        let emitdata = {
            result: 'sb',
            smallBlind: this.smallBlind,
            playerName: player.playerName,
            playerPosition: player.getIndex(),
            playerCards: player.cards,
            playerChips: player.chips,
            message: message
        };
        this.io.sockets.in('r' + this.id).emit('SmallBlind_Deal', emitdata);

        this.maxRank_players = [];
        let players = this.table.players;
        let ranked_players = [];
        let ranks = [];
        for (let i = 0; i < players.length; i++) {
            if (players[i]) {
                const element = players[i];
                element.win = false;
                ranks.push(element._GetHand().rank);
                ranked_players.push({ player: element, id: element.playerID, rank: element._GetHand().rank });
            }
        }
        let maxHandRank = Math.max.apply(null, ranks);
        this.maxRank_players = ranked_players.filter(x => x.rank == maxHandRank);
        this.maxRank_players.forEach(p => {
            p.player.win = true;
        });
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.onBigBlind = function (player) {
    try {
        this.totalPot += this.bigBlind;
        let message = player.playerName + " posted big blind with $" + ChangeUnit(this.bigBlind)
        let emitdata = {
            bigBlind: this.bigBlind,
            playerName: player.playerName,
            playerPosition: player.getIndex(),
            playerCards: player.cards,
            playerChips: player.chips,
            dealer: this.table.dealer,
            table: this.table,
            message: message
        }
        this.io.sockets.in('r' + this.id).emit('BigBlind_Deal', emitdata);
        setTimeout(() => {
            this.table.NextPlayer();
        }, 500);
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.onTurn = function (player) {
    try {
        setTimeout(() => {
            let emitdata = {
                roomid: this.id,
                name: player.playerName,
                position: player.getIndex(),
                chips: player.chips,
                timeBank: 3,//player.timebank,
                thoughtTime: 6,
                currentBet: player.GetBet(),
                maxBet: this.table.getMaxBet(),
                legalBet: this.legalBet,
                roundBet: player.GetRoundBet(),
                isFolded: player.folded,
                isAllIn: player.isAllIn,
                isSeated: player.isSeated,
                isEmptySeat: player.isEmptySeat,
                table: this.table
            };
            this.io.sockets.in('r' + this.id).emit('turn', emitdata);
        }, 1000);
        this.turn = true;
        if (player.mode == 'bot') {
            this.actionBot(player)
            return;
        }
        const thoughtTime = 6000;
        let timebank = 3 * 1000;
        let timeout = thoughtTime + timebank;

        this.currentTimeout = setTimeout(() => {
            player.foldCount++;
            if (player.GetBet() >= this.table.getMaxBet()) {
                this.check(player);
            } else {
                this.fold(player);
            }
            player.updateTimebank(0);
            this.removetimeout();
            if (player.foldCount == 2)
                this.standUp({ username: player.playerName, userid: player.playerID });
        }, timeout);
    } catch (error) {
        console.log(error);
    }
};

TableManager.prototype.actionBot = function (player) {
    try {
        let goodcards = false;
        let botgoodcards = false;
        let card = '';
        let pSuit = '';
        for (let ind = 0; ind < player.cards.length; ind++) {
            card += player.cards[ind].charAt(0);
            pSuit += player.cards[ind].charAt(1);
        }

        let reverseCard = card.split('').reverse().join('');

        if (pocketCards.filter(x => x == card).length > 0) {
            goodcards = true;
        }

        else if (pocketCards.filter(x => x == reverseCard).length > 0) {
            goodcards = true;
        }
        else {

            for (let ind = 0; ind < this.table.board.length; ind++) {
                pSuit += this.table.board[ind].charAt(1);
            }

            if ((pSuit.match(new RegExp("S", "g")) || []).length == 5 || (pSuit.match(new RegExp("C", "g")) || []).length == 5 || (pSuit.match(new RegExp("D", "g")) || []).length == 5 || (pSuit.match(new RegExp("H", "g")) || []).length == 5) {
                goodcards = true;
            }
        }
        if (this.hardCount > 0) {
            goodcards = false;
            let winPlayers = this.table.checkWinners();

            let playerWinCount = 0;
            for (let i = 0; i < this.table.players.length; i++) {
                //console.log(this.table.players[i]);
                if (this.table.players[i] != undefined && this.table.players[i].mode != 'bot') {
                    if (winPlayers.includes(this.table.players[i].getIndex())) playerWinCount++;
                }
            }
            if (playerWinCount == 0) botgoodcards = true;
            if (winPlayers.includes(player.getIndex())) {
                goodcards = true;
            }
            //this.hardCount--;
        }
        setTimeout(() => {
            try {
                let info = {
                    action: '',
                    bet: 0,
                    legal_bet: 0
                }
                let current_Bet = player.GetBet();
                let max_Bet = this.table.getMaxBet();
                let call = max_Bet - current_Bet;
                let canCheck, canCall, canRaise = true;
                let minRaise = 0;
                if (call == 0)
                    minRaise = this.bigBlind;
                else if (call >= player.chips) {
                    call = player.chips;
                    canRaise = false;
                    canCall = true;
                }
                else {
                    if (current_Bet == 0) {
                        minRaise = call + this.legalBet;
                    }
                    else {
                        if (call < this.bigBlind)
                            minRaise = call + this.bigBlind;
                        else
                            minRaise = call + this.legalBet;
                    }
                }
                if (minRaise > player.chips) {
                    minRaise = player.chips;
                }
                if (current_Bet < max_Bet)
                    canCall = true;
                else
                    canCheck = true;
                if (canCheck) info.action = 'check';
                else if (canCall && (this.isRaise && (botgoodcards || goodcards) || !this.isRaise)) {
                    if (!this.isRaise && canCall) {
                        info.action = 'call';
                        info.bet = call;
                    } else if (this.isRaise) {
                        if(goodcards) {
                            info.action = 'call';
                            info.bet = call;
                        } else if(botgoodcards) {
                            let random = goodcards ? 10 : Math.floor(Math.random() * 10);
                            if (random > 5) {
                                info.action = 'call';
                                info.bet = call;
                            }
                        }
                    }
                }
                if (goodcards == true) {
                    if (canCheck) info.action = 'check';
                    if (this.bigBlinds.indexOf(this.bigBlind) == -1) {
                        if ((goodcards == true || player.win == true)) {
                            let num1 = Math.floor(Math.random() * 10) + 1;
                            if (num1 > 4) {
                                if (canCall) {
                                    info.action = 'call';
                                    info.bet = call;
                                }
                                else console.log(">>> ERROR1".err);
                            }
                            else {
                                let randomNumber = raiseRandom[Math.floor(Math.random() * raiseRandom.length)];
                                if (canRaise) {
                                    info.legal_bet = this.legalBet;
                                    info.bet = randomNumber * minRaise;
                                    let maxBet = max_Bet;
                                    let currentBet = current_Bet;
                                    if (info.bet < player.chips) {
                                        if ((maxBet - currentBet) == info.bet) {
                                            info.action = 'call';
                                        } else {
                                            info.action = 'raise';
                                            this.isRaise = true;
                                        }
                                        info.legal_bet = info.bet - call;
                                    } else {
                                        let buff = 0;
                                        let index = 0;
                                        for (let i = 0; i < this.table.players.length; i++) {
                                            console.log(this.table.players[i]);
                                            if (this.table.players[i] != undefined && this.table.players[i].chips != undefined && buff <= this.table.players[i].chips) {
                                                buff = this.table.players[i].chips;
                                                index = i;
                                            }
                                        }
                                        if (buff < player.chips) {
                                            if (this.table.game.bets.length > 0) {
                                                info.bet = buff + this.table.game.bets[index] - player.GetBet();
                                            } else {
                                                info.bet = buff - player.GetBet();
                                            }
                                        } else {
                                            info.bet = player.chips;
                                        }

                                        info.action = 'allin';
                                    }
                                }
                                else {
                                    if (canCall) {
                                        info.action = 'call';
                                        info.bet = call;
                                    }
                                    else console.log(">>> ERROR2".err);
                                }
                            }
                        }
                        
                    }
                    // else {
                    //     if (goodcards == true) {
                    //         let num1 = Math.floor(Math.random() * 2) + 1;
                    //         if (num1 == 1) {
                    //             if (canCall) {
                    //                 info.action = 'call';
                    //                 info.bet = call;
                    //             }
                    //             else console.log(">>> ERROR1".err);
                    //         }
                    //         else {
                    //             let randomNumber = raiseRandom[Math.floor(Math.random() * raiseRandom.length)];
                    //             if (canRaise) {
                    //                 info.legal_bet = this.legalBet;
                    //                 info.bet = randomNumber * minRaise;
                    //                 let maxBet = max_Bet;
                    //                 let currentBet = current_Bet;
                    //                 if (info.bet < player.chips) {
                    //                     if ((maxBet - currentBet) == info.bet) {
                    //                         info.action = 'call';
                    //                     } else {
                    //                         info.action = 'raise';
                    //                         this.isRaise = true;
                    //                     }
                    //                     info.legal_bet = info.bet - call;
                    //                 } else {
                    //                     info.bet = player.chips;
                    //                     info.action = 'allin';
                    //                 }
                    //             }
                    //             else {
                    //                 if (canCall) {
                    //                     info.action = 'call';
                    //                     info.bet = call;
                    //                 }
                    //                 else console.log(">>> ERROR2".err);
                    //             }
                    //         }
                    //     }
                    //     else {
                    //         info.action = 'fold';
                    //     }
                    // }

                }
                let message = player.playerName;
                this.removetimeout();
                player.updateTimebank(3);
                switch (info.action) {
                    case 'call':
                        if (info.bet == player.chips) {
                            message += " called(allin) with $" + ChangeUnit(player.chips);
                            player.allIn();
                            info.action = "allin";
                        } else {
                            player.call();
                            message += " called with $" + ChangeUnit(info.bet);
                        }
                        break;
                    case 'check':
                        player.Check();
                        message += " checked";
                        break;
                    case 'raise':
                        player.bet(fixNumber(info.bet));
                        this.legalBet = fixNumber(info.legal_bet);
                        message += " raised with $" + ChangeUnit(fixNumber(info.bet));
                        this.isRaise = true;
                        break;
                    case 'allin':
                        message += " bets(allin) with $" + ChangeUnit(player.chips);
                        player.allIn();
                        break;
                    case 'fold':
                        player.fold();
                        message += " folded";
                        break;
                    default:
                        player.fold();
                        message += " folded";
                        info.action = "fold";
                        break;
                }

                let buff = this.totalPot;
                buff += fixNumber(info.bet);
                this.totalPot = buff;
                let emitdata = {
                    roomid: this.id,
                    name: player.playerID,
                    position: player.getIndex(),
                    action: info.action,
                    bet: info.bet,
                    chips: player.chips,
                    currentBet: player.GetBet(),
                    maxBet: this.table.getMaxBet(),
                    roundBet: player.GetRoundBet(),
                    roundPot: this.table.getRoundPot(),
                    totalPot: this.totalPot,
                    isFolded: player.folded,
                    isAllIn: player.isAllIn,
                    isSeated: player.isSeated,
                    isEmptySeat: player.isEmptySeat,
                    message: message
                };
                this.io.sockets.in('r' + this.id).emit('PLAYER_ACTION_RESULT', emitdata);
            } catch (error) {
                console.log(error);
            }
        }, Math.floor(Math.random() * 1000) + 1000);
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.onDealCards = function (boardCardCount, currnt_bets) {
    try {
        let mainpots = this.roundMainPots(currnt_bets);
        this.mainPots = this.getMainPots(this.mainPots, mainpots);
        let emitdata = null;
        switch (this.table.game.roundName) {
            case 'Flop':
                this.legalBet = 0;
                let board1 = this.table.game.board;
                let hands1 = [];
                for (let i = 0; i < this.table.players.length; i++) {
                    const element = this.table.players[i];
                    if (element && element.cards.length == 2) {
                        let _hand = {
                            id: i,
                            cards: element.cards
                        };
                        hands1.push(_hand);
                    }
                }
                console.log("hands1");
                console.log(hands1);
                let handStrengths1 = Ranker.orderHands(hands1, board1);
                emitdata = {
                    roomid: this.id,
                    roundname: 'Flop',
                    card: this.table.game.board,
                    pot: '' + this.table.getRoundPot(),
                    mainpots: this.mainPots,
                    handStrengths: handStrengths1
                };
                setTimeout(() => {
                    this.table.setCurrentPlayerToSmallBlind();
                }, 1000);
                break;
            case 'Turn':
                this.legalBet = 0;
                let board2 = this.table.game.board;
                let hands2 = [];
                for (let i = 0; i < this.table.players.length; i++) {
                    const element = this.table.players[i];
                    if (element && element.cards.length == 2) {
                        let _hand = {
                            id: i,
                            cards: element.cards
                        };
                        hands2.push(_hand);
                    }
                }

                let handStrengths2 = Ranker.orderHands(hands2, board2);
                emitdata = {
                    roomid: this.id,
                    roundname: 'Turn',
                    card: this.table.game.board,
                    pot: '' + this.table.getRoundPot(),
                    mainpots: this.mainPots,
                    handStrengths: handStrengths2
                };

                setTimeout(() => {
                    this.table.setCurrentPlayerToSmallBlind();
                }, 1000);
                break;
            case 'River':
                this.legalBet = 0;
                let board3 = this.table.game.board;
                let hands3 = [];
                for (let i = 0; i < this.table.players.length; i++) {
                    const element = this.table.players[i];
                    if (element && element.cards.length == 2) {
                        let _hand = {
                            id: i,
                            cards: element.cards
                        };
                        hands3.push(_hand);
                    }
                }
                let handStrengths3 = Ranker.orderHands(hands3, board3);
                emitdata = {
                    roomid: this.id,
                    roundname: 'River',
                    card: this.table.game.board,
                    pot: '' + this.table.getRoundPot(),
                    mainpots: this.mainPots,
                    handStrengths: handStrengths3
                };

                setTimeout(() => {
                    this.table.setCurrentPlayerToSmallBlind();
                });
                break;
            case 'Showdown':
                if (this.table.game.board.length == 5) {
                    if (boardCardCount == 5) {
                        this.showWinDelay = 1500;
                    }
                    this.legalBet = 0;
                    let board3 = this.table.game.board;
                    let hands3 = [];
                    for (let i = 0; i < this.table.players.length; i++) {
                        const element = this.table.players[i];
                        if (element && element.cards.length == 2) {
                            let _hand = {
                                id: i,
                                cards: element.cards
                            };
                            hands3.push(_hand);
                        }
                    }
                    let handStrengths3 = Ranker.orderHands(hands3, board3);
                    emitdata = {
                        roomid: this.id,
                        roundname: 'Showdown',
                        card: this.table.game.board,
                        pot: '' + this.table.getRoundPot(),
                        mainpots: this.mainPots,
                        handStrengths: handStrengths3
                    };
                    this.io.in('r' + this.id).emit('TABLE_ROUND', emitdata);
                }
                break;
        }
        if (emitdata != null) {
            if (emitdata.roundname != "Showdown") {
                setTimeout(() => {

                    if (!this.table.onlyoneplayerremaining()) {
                        this.io.in('r' + this.id).emit('TABLE_ROUND', emitdata);
                    }
                }, 500);
            }
        }
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.onRoundShowdown = function (currnt_bets) {
    try {
        let _mainpots = this.roundMainPots(currnt_bets);
        this.mainPots = this.getMainPots(this.mainPots, _mainpots);
        let boardCards = [];
        if (this.table.game.board != undefined) {
            boardCards = this.table.game.board;
        }
        let emitdata = {
            roomid: this.id,
            roundname: 'Showdown',
            card: boardCards,
            pot: '' + this.table.getRoundPot(),
            mainpots: this.mainpots
        };
        this.io.in('r' + this.id).emit('TABLE_ROUND', emitdata);
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.onWin = function (winner, prize) {
    try {
        setTimeout(() => {
            let handrankVal = 0;
            if (!isNaN(winner.hand.rank)) {
                handrankVal = winner.hand.rank;
            }
            let board4 = this.table.game.board;
            let hands4 = [];
            if (winner.cards.length == 2) {
                let _hand = {
                    id: winner.getIndex(),
                    cards: winner.cards
                };
                hands4.push(_hand);
            }
            let handStrengths4 = null;
            if (board4.length >= 3)
                handStrengths4 = Ranker.orderHands(hands4, board4);
            let message = winner.playerName + " won $" + ChangeUnit(prize) + " with ";
            let wining_hand = winner.hand.message;
            message += wining_hand;
            let wining_cards = [];
            if (handStrengths4 != null) {
                message += ":";
                let playingcard = handStrengths4[0][0]["playingCards"];
                for (let k = 0; k < playingcard.length; k++) {
                    message += '(' + playingcard[k]["suit"] + ')' + playingcard[k]["rank"] + ' ';
                    wining_cards.push(playingcard[k]["rank"] + playingcard[k]["suit"]);
                }
            }
            if (winner.hand.cards.length > 2) {
                let result = Ranker.getHand(winner.hand.cards);
                //console.log(result.ranking)
                winner.hand.message = result.ranking;
            }
            let emitdata = {
                winner: winner.playerName,
                id: winner.playerID,
                position: winner.getIndex(),
                won: prize,
                handrank: winner.hand.message,
                wincards: winner.hand.cards,
                handrankvalue: handrankVal,
                handStrength: handStrengths4,
                message: message
            };

            for (let k = 0; k < this.table.players.length; k++) {
                const player = this.table.players[k];
                if (player && player.isEmptySeat == false && player.isSeated == true) {
                    this.Update_level_handplayed(player.playerID);
                }
            }
            this.Update_recent_players();
            setTimeout(() => {
                this.Record_Won_History(winner.playerID, prize, wining_hand, wining_cards, handrankVal);
            }, 100);
            this.io.in('r' + this.id).emit('TABLE_WIN', emitdata);
        }, this.showWinDelay);
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.onGameOver = async function () {
    try {
        this.played++;
        this.totalPot = 0;

        //await this.addPlayers();
        let roomSockets = [];
        let roomID = this.id;
        if (this.io.nsps['/'].adapter.rooms['r' + roomID] != undefined) {
            for (let socketID in this.io.nsps['/'].adapter.rooms['r' + roomID].sockets) {
                let nickname = this.io.nsps['/'].connected[socketID].username;
                let clientSocket = this.io.sockets.connected[socketID];
                roomSockets.push({
                    nickname: nickname,
                    clientSocket: clientSocket
                });
            }
        }

        if (roomSockets.length == 0) {
            this.removeBots(this.table.getIngamePlayersLength());
            this.status = 0;
            this.table.started = false;
            roommanager.removeTable(this.instance);
        }
        else {

            await this.waitforSec(2000);
            await this.addPlayers();
            if (this.botCount > 0) {
                let bookingPlayers = this.players.filter(p => p.booking == true);
                let createCount = this.botCount - this.table.getIngamePlayersLength() - bookingPlayers.length;
                let removeCount = (this.table.getIngamePlayersLength() + bookingPlayers.length) - this.botCount;
                if (createCount > 0)
                    await this.createBots(createCount);
                else if (removeCount > 0)
                    await this.removeBots(removeCount);
            }

            await this.getStatus();
            await this.tableReposition();
            if (this.table.getIngamePlayersLength() > 1) {
                let time = 0;
                setTimeout(() => {
                    this.hardCount = 0;
                    if (this.smallBlind >= 10000000000) {
                        this.hardCount = 6;
                        let randomC = Math.floor(Math.random() * 3);
                        if (randomC != 0)
                            this.hardCount = 6;
                        else
                            this.hardCount = 0;
                    }
                    this.isRaise = false;
                    this.table.initNewRound();
                }, time);
            }
        }
    } catch (error) {
        console.log(error);
    }
};

TableManager.prototype.waitforSec = function (time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

TableManager.prototype.onlyBotsLive = function () {
    try {
        let roomSockets = [];
        let roomID = this.id;
        if (this.io.nsps['/'].adapter.rooms['r' + roomID] != undefined) {
            for (let socketID in this.io.nsps['/'].adapter.rooms['r' + roomID].sockets) {
                let nickname = this.io.nsps['/'].connected[socketID].username;
                let clientSocket = this.io.sockets.connected[socketID];
                roomSockets.push({
                    nickname: nickname,
                    clientSocket: clientSocket
                });
            }
        }

        if (roomSockets.length == 0 && this.table.getIngamePlayersLength() == 6)
            return true;
        else
            return false;
    } catch (error) {
        console.log(error);
        return true;
    }
};
TableManager.prototype.onUpdatePlayer = function (player) {
    this.io.in('r' + this.id).emit('UPDATE_PLAYER', {
        player: player
    });
};
TableManager.prototype.onReturnChips = function (position, returnChips) {
    let emitdata = {
        position: position,
        chips: returnChips
    };
    this.io.in('r' + this.id).emit('RETURN_CHIPS', emitdata);
};
TableManager.prototype.onBankrupt = function (player) {
    try {
        this.io.in('r' + this.id).emit('Bankrupt', {
            player: player
        });
        if (player.mode == 'bot') {
            player.chips = this.minBuyin;
            player.isSeated = true;
            player.isEmptySeat = false;
        }
        else {
            console.log("bankrupt");
            this.check_points(player, this.minBuyin);

        }
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.checkIndex = function (player, position) {
    let index = player.getIndex();
    if (index == position)
        return true;
    else
        return false;
}
TableManager.prototype.action = function (info) {
    try {
        let player = this.table.getPlayerByID(info.player_id);
        if (!player || player == undefined) return;
        if (player.table.currentPlayer != info.position && this.checkIndex(player, info.position)) return;
        let message = player.playerName;
        this.removetimeout();
        //player.updateTimebank(parseInt(info.timebank));
        switch (info.action) {
            case 'call':
                if (info.bet == player.chips) {
                    message += " called(allin) with $" + ChangeUnit(player.chips);
                    player.allIn();
                    info.action = "allin";
                } else {
                    player.call();
                    message += " called with $" + ChangeUnit(info.bet);
                }
                break;
            case 'check':
                player.Check();
                message += " checked";
                break;
            case 'raise':
                player.bet(fixNumber(info.bet));
                this.legalBet = fixNumber(info.legal_bet);
                message += " raised with $" + ChangeUnit(fixNumber(info.bet));
                this.isRaise = true;
                break;
            case 'allin':
                message += " bets(allin) with $" + ChangeUnit(player.chips);
                player.allIn();
                break;
            case 'fold':
                player.fold();
                message += " folded";
                break;
        }

        let buff = this.totalPot;
        buff += fixNumber(info.bet);
        this.totalPot = buff;
        let emitdata = {
            roomid: this.id,
            name: info.player_id,
            position: info.position,
            action: info.action,
            bet: info.bet,
            chips: player.chips,
            currentBet: player.GetBet(),
            maxBet: this.table.getMaxBet(),
            roundBet: player.GetRoundBet(),
            roundPot: this.table.getRoundPot(),
            totalPot: this.totalPot,
            isFolded: player.folded,
            isAllIn: player.isAllIn,
            isSeated: player.isSeated,
            isEmptySeat: player.isEmptySeat,
            message: message
        };
        this.io.sockets.in('r' + this.id).emit('PLAYER_ACTION_RESULT', emitdata);
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.fold = function (player) {
    try {
        let message = player.playerName + " folded";
        if (!player || player === undefined) return;
        if (player.table.currentPlayer != player.getIndex()) return;
        this.removetimeout();
        if (player) {
            let emitdata = {
                roomid: this.id,
                name: player.playerID,
                position: player.getIndex(),
                action: 'fold',
                bet: 0,
                chips: player.chips,
                currentBet: player.GetBet(),
                maxBet: this.table.getMaxBet(),
                roundBet: player.GetRoundBet(),
                roundPot: player.table.getRoundPot(),
                totalPot: this.totalPot,
                isFolded: player.folded,
                isAllIn: player.isAllIn,
                isSeated: player.isSeated,
                isEmptySeat: player.isEmptySeat,
                message: message
            };
            this.io.sockets.in('r' + this.id).emit('PLAYER_ACTION_RESULT', emitdata);
            player.fold();
        }
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.check = function (player) {
    try {
        if (!player || player === undefined) return;
        if (player.table.currentPlayer != player.getIndex()) return;
        this.removetimeout();
        let message = player.playerName + " checked";
        if (player) {
            let emitdata = {
                roomid: this.id,
                name: player.playerID,
                position: player.getIndex(),
                action: 'check',
                bet: 0,
                chips: player.chips,
                currentBet: player.GetBet(),
                maxBet: this.table.getMaxBet(),
                roundBet: player.GetRoundBet(),
                roundPot: this.table.getRoundPot(),
                totalPot: this.totalPot,
                isFolded: player.folded,
                isAllIn: player.isAllIn,
                isSeated: player.isSeated,
                isEmptySeat: player.isEmptySeat,
                message: message
            };
            this.io.in('r' + this.id).emit('PLAYER_ACTION_RESULT', emitdata);
            player.Check();
        }
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.removetimeout = function () {
    this.turn = false;
    if (this.currentTimeout !== null) {
        clearTimeout(this.currentTimeout);
        this.currentTimeout = null;
    }
};
TableManager.prototype.roundMainPots = function (bets) {
    try {
        let mainPots = [];
        while (this.checkbets(bets) > 0) {
            let min = bets[0];
            for (let i = 0; i < bets.length; i++) {
                if (bets[i] > 0)
                    min = min < bets[i] ? min : bets[i];
                if (min == 0)
                    min = bets[i];
            }
            let mid = 0;
            let seats = [];
            for (let i = 0; i < bets.length; i++) {
                const element = bets[i];
                if (element >= min) {
                    bets[i] -= min;
                    mid += min;
                    seats.push(i);
                }
            }
            let json = {
                pot: mid,
                seats: seats
            }
            mainPots.push(json);
        }
        return mainPots;
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.percentIncrease = (partnumber, totalnumber) => Math.ceil((partnumber / totalnumber) * 100);
TableManager.prototype.checkbets = function (bets) {
    let sum = 0;
    for (let index = 0; index < bets.length; index++) {
        const element = bets[index];
        sum += element;
    }
    return sum;
};
TableManager.prototype.getMainPots = function (tPots, mainPots) {
    try {
        for (let i = 0; i < tPots.length; i++) {
            for (let j = 0; j < mainPots.length; j++) {
                let arr1 = tPots[i].seats;
                let arr2 = mainPots[j].seats;
                if (this.compareArray(arr1, arr2) == true) {
                    tPots[i].pot += mainPots[j].pot;
                }
            }
        }

        for (let i = 0; i < mainPots.length; i++) {
            const element = mainPots[i];
            if (element.seats.length != 0) {
                tPots.push(element);
            }
        }
        return tPots;
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.compareArray = function (arr1, arr2) {
    try {
        let rst = false;
        if (arr1.length != arr2.length) {
            return rst;
        }
        arr1.forEach(function (item) {
            let i = arr2.indexOf(item);
            if (i > -1) {
                arr2.splice(i, 1);
            }
        });
        rst = arr2.length == 0;
        return rst;
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.Update_recent_players = function () {
    try {
        let realPlayers = this.table.players.filter(player => player && player.isEmptySeat == false && player.isSeated == true && player.mode != 'bot'); //
        if (realPlayers.length > 0) {
            let playerIds = [];
            for (let i = 0; i < realPlayers.length; i++) {
                playerIds.push(realPlayers[i].playerID);
            }
            for (let k = 0; k < realPlayers.length; k++) {
                const player = realPlayers[k];
                if (player.mode == 'normal') {
                    let query = {
                        username: player.playerName,
                        userid: player.playerID
                    };

                    this.collection_UserData.findOne(query, (err, result) => {
                        if (err)
                            console.log("error12", err);
                        else {
                            if (result != null) {
                                let newPlayerIds = playerIds.filter(p => p != player.playerID);
                                let newRecents = newPlayerIds.concat(result.recents);
                                let nnewRecents = [];
                                if (newRecents.length > 50) {
                                    for (let j = newRecents.length - 1; j >= (newRecents.length - 50); j--) {
                                        const element = newRecents[j];
                                        nnewRecents.push(element);
                                    }
                                }
                                else nnewRecents = newRecents;
                                let result1 = [...new Set(nnewRecents)];
                                this.collection_UserData.updateOne(query, {
                                    $set: {
                                        recents: result1
                                    }
                                }, function (err) {
                                    if (err) throw err;
                                });
                            }
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}
TableManager.prototype.Update_level_handplayed = function (userid) {
    try {
        let query = {
            userid: userid
        };
        this.collection_UserData.findOne(query, (err, result) => {
            if (err)
                console.log("error12", err);
            else {
                if (result != null) {
                    let hands_played = result.hands_played;
                    hands_played += 1;
                    let divided = 0;
                    let level = 0;
                    if (result.level < 11) {
                        divided = parseInt(hands_played / 50);
                        level = divided + 1;
                    } else {
                        level = 11 + parseInt(((hands_played - 500) / 100));
                    }
                    let percent_won = this.percentIncrease(result.hands_won, hands_played);
                    this.collection_UserData.updateOne(query, {
                        $set: {
                            hands_played: hands_played,
                            level: level,
                            win_percent_holdem: percent_won
                        }
                    }, function (err) {
                        if (err) throw err;
                    });
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.Record_Won_History = function (winner, prize, wining_hand, wining_cards, handrankVal) {
    try {
        let query = {
            userid: winner
        };
        let best_winning_hand = {
            cards: wining_cards,
            hand: wining_hand,
            handval: handrankVal
        };
        this.collection_UserData.findOne(query, (err, result) => {
            if (err)
                console.log("error2", err);
            else {
                if (result != null) {
                    let hands_won = result.hands_won;
                    hands_won += 1;
                    let percent_won = this.percentIncrease(hands_won, result.hands_played);
                    this.collection_UserData.updateOne(query, {
                        $set: {
                            hands_won: hands_won,
                            win_percent_holdem: percent_won
                        }
                    }, function (err) {
                        if (err) throw err;
                    });
                    if (result.biggest_pot_won < prize) {
                        this.collection_UserData.updateOne(query, {
                            $set: {
                                biggest_pot_won: prize
                            }
                        }, function (err) {
                            if (err) throw err;
                        });
                    }
                    if (result.best_winning_hand.handval < handrankVal) {
                        this.collection_UserData.updateOne(query, {
                            $set: {
                                best_winning_hand: best_winning_hand
                            }
                        }, function (err) {
                            if (err) throw err;
                        });
                    }
                    let ind = null;
                    for (let i = 0; i < config.STAKES_SB.array.length; i++) {
                        const element = config.STAKES_SB.array[i];
                        if (this.smallBlind == element) {
                            ind = i; break;
                        }
                    }
                    if (wining_hand.toLowerCase() == "royal flush") {
                        if (ind != null) {

                            this.collection_UserData.updateOne(query, {
                                $set: {
                                    points: result.points + parseInt(config.JACKPOT_WINS_ROYALFLASH.array[ind])
                                }
                            }, function (err) {
                                if (err) throw err;
                            });
                        }
                    }
                    if (wining_hand.toLowerCase() == "straight flush" || wining_hand.toLowerCase() == "four of a kind") {
                        if (ind != null) {
                            this.collection_UserData.updateOne(query, {
                                $set: {
                                    points: result.points + parseInt(config.JACKPOT_WINS_4KINDS.array[ind])
                                }
                            }, function (err) {
                                if (err) throw err;
                            });
                        }

                    }
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.addPlayers = function () {
    try {
        return new Promise(resolve => {
            let bookingPlayers = this.players.filter(p => p.booking == true);
            if (bookingPlayers.length > 0) {
                let i = bookingPlayers.length;
                let checkroom = setInterval(() => {
                    if (i <= bookingPlayers.length && i > 0) {
                        i--;
                        let player = bookingPlayers[i];
                        this.table.addPlayer({
                            playerName: player.username,
                            playerID: player.userid,
                            chips: player.balance,
                            avatar: player.avatar,
                            photoUrl: player.photoUrl,
                            photoType: player.photoType,
                            mode: 'normal',
                            position: player.seatnumber
                        });
                        this.removeItem(this.players, player);
                    }
                    else {
                        clearInterval(checkroom);
                        resolve();
                    }
                }, 100);
            }
            else resolve();
        });
    } catch (error) {
        console.log(error);
    }

};
TableManager.prototype.tableReposition = function () {
    try {
        for (let i = 0; i < this.table.players.length; i++) {
            if (this.table.players[i] != undefined && typeof (this.table.players[i].folded) != undefined && this.table.players[i].folded != undefined) {
                this.table.players[i].folded = false;
            }
        }
        return new Promise(resolve => {
            let time = 30 * this.table.getIngamePlayersLength();
            let Reposition_time = time + 1500;
            setTimeout(() => {
                let emitdata = {
                    played: this.played,
                    level: this.level,
                    table: this.table
                };
                this.io.in('r' + this.id).emit('TABLE_REPOSITION', emitdata);
                resolve();
            }, Reposition_time);
        });
    } catch (error) {
        console.log(error);
    }

};

TableManager.prototype.enterTable = function (socket, username, userid) {
    try {
        let positions = [];
        let pos = 0;
        for (let i = 0; i < this.players.length; i++) {
            let element = this.players[i];
            positions.push(element.seatnumber);
        }
        while (true) {
            if (this.table.players[pos] === undefined || (this.table.players[pos] && this.table.players[pos].playerName == "Empty seat")) {
                let a = positions.filter(x => x == pos);
                if (a.length == 0) {
                    break;
                } else
                    pos++;
            } else {
                pos++;
            }
        }

        if (pos + 1 > this.maxPlayers) {

            let emData = {
                result: "failed",
                roomid: this.id,

                bigBlind: this.bigBlind,
                seated: false,
                seatnumber: pos
            };
            socket.emit('REQ_ENTER_ROOM_RESULT', emData);
            return;
        }
        socket.room = 'r' + this.id;
        socket.username = username;
        socket.userid = userid;

        socket.join('r' + this.id);
        let wCount = 0;
        for (let i = 0; i < this.waitingPlayers.length; i++) {
            if (this.waitingPlayers[i].userid == userid) {
                wCount++;
                break;
            }
        }
        if (wCount == 0)
            this.waitingPlayers.push({ username: username, userid: userid, avatarUrl: "", chips: 0, photo_index: 0, photo_type: 0 });

        //this.waitingPlayers.push({ username: username, userid: userid, avatarUrl: "", chips: 0, photo_index: 0, photo_type: 0 });

        let emData = {
            result: "success",
            roomid: this.id,

            bigBlind: this.bigBlind,
            seated: false,
            seatnumber: pos
        };

        socket.emit('REQ_ENTER_ROOM_RESULT', emData);

        let query = {
            userid: userid
        };
        this.collection_UserData.updateOne(query, {
            $set: {
                connected_room: this.id
            }
        }, function (err) {
            if (err) throw err;
        });

        this.checkBotStatus(socket);
        console.log("enterTable:Status");
        this.getStatus();
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.checkBotStatus = function () {
    try {
        if (this.botCount > 0 && this.minBuyin <= 400000000000) {
            if (this.status == 0) {
                this.createBots(this.botCount);
            }
        }
    } catch (error) {
        console.log(error);
    }
}
TableManager.prototype.AddChipsUser = function (userid, points) {
    try {
        let player = this.table.players.find((p) => (p && p.playerID == userid));
        if (player == null) return;

        player.chips += parseInt(points);
    } catch (error) {
        console.log(error);
    }
}
TableManager.prototype.MinusChipsUser = function (userid, points) {
    try {
        let player = this.table.players.find((p) => (p && p.playerID == userid));
        if (player == null) return;
        player.chips -= parseInt(points);
    } catch (error) {
        console.log(error);
    }
}
TableManager.prototype.createBots = function (createCount) {
    try {
        return new Promise(resolve => {
            // let newnam = [];
            // let userNames = realNames;
            // while(userNames.length > createCount){
            //     let movenum = userNames.splice(Math.floor(Math.random() * userNames.length),1)[0]
            //     newnam.push(movenum);
            // }
            let count = 0;
            let interval = setInterval(() => {
                count++;
                if (count <= createCount) {
                    let userinfo = roommanager.getBotUrl(this.instance);
                    //let username = roommanager.getBotName(this.instance);
                    let username = userinfo.name;
                    let userphoto = userinfo.url;
                    let userid = this.getBotID();
                    //console.log('--> Create Bot | ', username, userid);
                    // create bot
                    this.table.addPlayer({
                        playerName: username,
                        playerID: userid,
                        chips: parseInt(this.minBuyin),
                        avatar: Math.floor(Math.random() * 119) + 1,
                        photoUrl: userphoto,
                        photoType: 0,
                        mode: 'bot'
                    });
                } else {
                    clearInterval(interval);
                    if (this.status == 0) {
                        this.status = 1;
                        this.table.startGame();
                    }
                    console.log("CreateBot:Status");
                    this.getStatus();
                    resolve();
                }
            }, 200);
        });
    } catch (error) {
        console.log(error);
    }

};
TableManager.prototype.removeBots = function (removeCount) {
    try {
        return new Promise(resolve => {
            let count = 0;
            let interval = setInterval(() => {
                count++;
                if (count <= removeCount) {
                    let player = this.table.players.find(p => p && p.mode == 'bot' && p.playerName != "Empty seat");
                    //console.log('--> Remove Bot | ', player.playerName, player.playerID);
                    if (player) {
                        this.removeItem(this.botNames, player.playerName);
                        this.removeItem(this.botUrls, player.photoUrl);
                        this.removeItem(this.botIDs, player.playerID);
                        // remove bot
                        this.standUp_force(player, 'remove');
                    }
                } else {
                    clearInterval(interval);
                    console.log("removeBots:Status");
                    this.getStatus();
                    resolve();
                }
            }, 700);
        });
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.getBotID = function () {
    try {
        let _id = "";
        while (_id == "" || this.botIDs.indexOf(_id) != -1) {
            let randomnum3 = '' + Math.floor(10000 + Math.random() * 90000);
            let randomnum4 = '' + Math.floor(100000 + Math.random() * 900000);
            _id = randomnum3 + randomnum4;
        }
        this.botIDs.push(_id);
        return _id;
    } catch (error) {
        console.log(error);
    }
};

TableManager.prototype.getStatus = function (isStandUp = 0) {
    try {
        return new Promise(resolve => {
            if (isStandUp == 0) {
                let emData = {
                    roomid: this.id,
                    seatlimit: this.table.maxPlayers,
                    gamemode: this.gameMode,
                    status: this.status,
                    totalPot: this.totalPot,
                    table: this.table,
                    played: this.played,
                    level: this.level,
                    playerlist: this.players,
                    isStandUp: isStandUp
                }
                this.io.sockets.in('r' + this.id).emit('CURRENT_ROOM_STATUS', emData);
            }

            setTimeout(() => {
                let emitData = {
                    result: this.players,
                    table: this.table,
                    isStandUp: isStandUp
                };
                this.io.sockets.in('r' + this.id).emit('TAKE_SEAT_PLAYERS', emitData);
                resolve();
            }, 100);
        });
    } catch (error) {
        console.log(error);
    }
};

TableManager.prototype.sitDown = function (info, socket) {
    this.addPlayer(info, socket);

};
TableManager.prototype.standUp_forever = function (info, socket) {
    this.standUp(info, socket);
}
TableManager.prototype.standUp_force = function (player, bankrupt) {
    this.standUp({ userid: player.playerID, username: player.playerName, mode: player.mode }, null, bankrupt);
};
TableManager.prototype.standUp = function (info, socket, bankrupt) {
    try {
        if (info.mode != "bot") {
            let wCount = 0;
            for (let i = 0; i < this.waitingPlayers.length; i++) {
                if (this.waitingPlayers[i].userid == info.userid) {
                    wCount++;
                    break;
                }
            }
            if (wCount == 0)
                this.waitingPlayers.push({ username: info.username, userid: info.userid, avatarUrl: "", chips: 0, photo_index: 0, photo_type: 0 });
        }
        let position = -1;
        let player = this.players.find((p) => (p.userid == info.userid && p.username == info.username));
        if (player) {
            this.in_points(player.username, player.userid, player.balance);
            this.removeItem(this.players, player);
            // if (!socket) {

            // }
        }
        else {
            player = this.table.players.find((p) => (p && p.playerID == info.userid && p.playerName == info.username));

            if (player) {
                position = player.getIndex();
                if (this.table.started == true) {
                    if (this.table.currentPlayer == position) {
                        if (bankrupt == undefined) console.log('>> fold')
                        if (bankrupt == undefined) this.fold(player);
                    }
                }
                this.in_points(info.username, info.userid, player.chips);
                this.table.RemovePlayer(info.userid);
            }
            else {
                console.log('wrong standup > nothing user on the table'.err);
            }
        }
        if (socket) {
            if (info.action) {
                let emitdata = {
                    userid: info.userid,
                    position: position,
                    action: 'leave'
                };
                //console.log('leave emitData: ' ,emitdata);
                this.io.sockets.in('r' + this.id).emit('PLAYER_LEAVE_RESULT', emitdata);
            }
            if (socket.userid == info.userid) {
                console.log("Correct User Leaved!".success);
                let query = {
                    userid: info.userid
                };
                this.collection_UserData.updateOne(query, {
                    $set: {
                        connected_room: ""
                    }
                }, function (err) {
                    if (err) throw err;
                });
            }
            setTimeout(() => {
                socket.leave('r' + this.id);
            }, 1000);
        }
        //console.log("StandUp:Status1");
        this.getStatus();
    } catch (error) {
        console.log(error);
    }
};

TableManager.prototype.addPlayer = function (info, socket) {
    try {
        let username = info.player_name;
        let userid = info.player_id;
        let seat = fixNumber(info.position);
        let avatar = fixNumber(info.avatar);
        let photoUrl = info.photoUrl;
        let photoType = fixNumber(info.photoType);

        let player = {
            username: username,
            userid: userid,
            balance: 0,
            avatar: avatar,
            photoUrl: photoUrl,
            photoType: photoType,
            seatnumber: seat,
            booking: false,
            gift: "",
            foldedCount: 0,
            timebank: 3,
            leaveenterflag: 0,
            getCorrectSeatnumber: 1,
            buyinflag: 1,
            waitforbb: 1,
            showcards: 0,
            mode: 'normal',
            moveroom: 0
        };
        this.players.push(player);

        let emitData = {
            result: "success",
            username: username,
            userid: userid,
            avatar: avatar,
            seat: seat,
            photoUrl: photoUrl,
            photoType: photoType
        };

        if (socket != null)
            this.io.sockets.in('r' + this.id).emit('REQ_TAKE_SEAT_RESULT', emitData);
        if(this.minBuyin > 400000000000 && this.players.length == 2) {
            this.table.startGame();
        }
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.WaitingPlayers = async function (info, socket) {
    try {
        await this.getWaitingData();
        let emitData = {
            result: "success",
            players: this.waitingPlayers
        }
        socket.emit("WAITING_PLAYERS", emitData);
    } catch (error) {
        console.log(error);
    }
}
TableManager.prototype.buyIn = function (info, socket) {
    try {
        let player = this.players.find((player) => (player.userid == info.userid && player.username == info.username));
        if (player) {
            player.balance += fixNumber(info.buyin_money);
            this.out_points(info.username, info.userid, info.buyin_money);
            player.booking = true;
            console.log(info);
            this.io.sockets.in('r' + this.id).emit('ADD_BALANCE', info);
            for (let i = 0; i < this.waitingPlayers.length; i++) {
                if (this.waitingPlayers[i].userid == info.userid) {
                    this.waitingPlayers.splice(i, 1);
                }
            }
            // this.checkTable();
            //console.log('player.userid ?', player.userid)
            if (this.status == 0) {
                this.table.addPlayer({
                    playerName: player.username,
                    playerID: player.userid,
                    chips: player.balance,
                    avatar: player.avatar,
                    photoUrl: player.photoUrl,
                    photoType: player.photoType,
                    mode: 'normal',
                    position: player.seatnumber
                });
                this.removeItem(this.players, player);
                //let bookingPlayers = this.players.filter(p => p.booking);
                if (this.table.getIngamePlayersLength() == this.table.minPlayers) {
                    this.status = 1;
                    this.table.startGame();
                }
            }
            else {
            }
        }
        else {
            player = this.table.players.find((player) => (player && player.playerID === info.userid && player.playerName === info.username));
            if (player) {
                player.chips += fixNumber(info.buyin_money);
                out_points(info.username, info.userid, info.buyin_money);
                this.io.sockets.in('r' + this.id).emit('BUYIN_BALANCE', info);
            }
            else {
                console.log('wrong buyin > nothing user on the table'.err);
            }
        }
        console.log("BuyIn:Status");
        this.getStatus(2);
    } catch (error) {
        console.log(error);
    }
};

TableManager.prototype.removeItem = function (arr, value) {
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
TableManager.prototype.in_points = function (username, userid, in_points) {
    try {
        //let collection = this.database.collection('User_Data');
        let query = { username: username, userid: userid };
        this.collection_UserData.findOne(query, (err, result) => {
            if (err) throw "in_points:", err;
            else if (result) {
                let mypoints = result.points;
                mypoints = mypoints.toString().replace(/\,/g, '');
                console.log(mypoints);
                in_points = in_points.toString().replace(/\,/g, '');
                console.log(in_points);
                mypoints = fixNumber(mypoints) + fixNumber(in_points);
                console.log(mypoints);
                if (fixNumber(mypoints) < 0) mypoints = 0;
                this.collection_UserData.updateOne(query, { $set: { points: fixNumber(mypoints) } }, function (err) {
                    if (err) throw err;
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.out_points = function (username, userid, out_points) {
    try {
        //let collection = this.database.collection('User_Data');
        let query = { username: username, userid: userid };
        this.collection_UserData.findOne(query, (err, result) => {
            if (err) throw "out_points:", err;
            else if (result) {
                let mypoints = result.points;
                mypoints = mypoints.toString().replace(/\,/g, '');
                out_points = out_points.toString().replace(/\,/g, '');
                mypoints = fixNumber(mypoints) - fixNumber(out_points);
                if (fixNumber(mypoints) < 0) mypoints = 0;
                this.collection_UserData.updateOne(query, { $set: { points: fixNumber(mypoints) } }, function (err) {
                    if (err) throw err;
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.getWaitingData = function () {
    try {
        return new Promise(resolve => {
            let wCount = 0, wLength = this.waitingPlayers.length;
            if (wLength == 0) resolve();
            for (let i = 0; i < this.waitingPlayers.length; i++) {
                let waitingPlayer = this.waitingPlayers[i];
                let query = { username: waitingPlayer.username, userid: waitingPlayer.userid };
                this.collection_UserData.findOne(query, (err, result) => {
                    if (err) {
                        console.log(err);
                    } else if (result) {
                        waitingPlayer.chips = result.points;
                        waitingPlayer.avatarUrl = result.photo;
                        waitingPlayer.photo_index = result.photo_index;
                        waitingPlayer.photo_type = result.photo_type;
                        wCount++;
                        if (wCount == wLength) {
                            resolve();
                        }
                    }
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}
TableManager.prototype.check_points = function (player, out_points) {
    try {
        let roomid = this.id;
        let roomTable = this;
        console.log("bankrupt3");
        //console.log(player);
        let query = { username: player.playerName, userid: player.playerID };
        console.log(query);
        this.collection_UserData.findOne(query, (err, result) => {
            if (err) {
                console.log(err);
                roomTable.standUp_force(player, 'Bankrupt');
            }
            else if (result) {
                console.log("bankrupt1");
                let mypoints = result.points;
                mypoints = mypoints.toString().replace(/\,/g, '');
                out_points = out_points.toString().replace(/\,/g, '');
                if (fixNumber(mypoints) >= fixNumber(out_points)) {
                    mypoints = fixNumber(mypoints) - fixNumber(out_points);
                    if (fixNumber(mypoints) < 0) mypoints = 0;
                    roomTable.collection_UserData.updateOne(query, { $set: { points: fixNumber(mypoints) } }, function (err) {
                        if (err) {
                            console.log(err);
                            roomTable.standUp_force(player, 'Bankrupt');
                        } else {
                            player.chips = out_points;
                            player.isSeated = true;
                            player.isEmptySeat = false;
                            console.log("roomId:" + roomid);
                            roomTable.io.sockets.in('r' + roomid).emit('ADD_BALANCE', { room_id: roomid, username: player.playerName, userid: player.playerID, buyin_money: out_points });
                        }
                    });
                }
                else {
                    console.log("bankrupt2");
                    roomTable.standUp_force(player, 'Bankrupt');
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
}

function fixNumber(str) {
    try {
        let newStr = str.toString().replace(/\,/g, '');
        let _fixnumber = Number(newStr);
        return _fixnumber;
    } catch (error) {
        console.log(error);
    }
};
var ChangeUnit = function (count) {
    try {
        let tokens = " KMBTqQsSondUDT";
        for (let i = 1; true; i += 1) {
            let val = Math.pow(1000, i);
            if (val > count) {
                return (count / Math.pow(1000, i - 1) + tokens[i - 1]).trim();
            }
        }
    } catch (error) {
        console.log(error);
    }
};
TableManager.prototype.getPlayerRander = function () {
    try {
        let players = this.table.players;
        let ranked_players = [];
        let ranks = [];
        for (let i = 0; i < players.length; i++) {
            const element = players[i];

            ranks.push(element._GetHand().rank);
            ranked_players.push({ name: element.playerName, rank: element._GetHand().rank });
        }
        let maxHandRank = Math.max.apply(null, ranks);
        let maxRank_players = ranked_players.filter(x => x.rank == maxHandRank);
        for (let j = 0; j < bots.length; j++) {
            const _bot = bots[j];
            if (_bot.roomid == roomlist[index].roomid) {
                _bot.getGameResult(maxRank_players);
            }
        }
    } catch (error) {
        console.log(error);
    }
}


var raiseRandom = [1, 2, 4];
var pocketCards = ['AA', 'AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'KA', 'KK', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'QA'
    , 'QK', 'QQ', 'QJ', 'QT', 'JA', 'JK', 'JQ', 'TA', 'TK', '9A', '8A', '7A', '6A', '5A', '4A', '3A', '9K', '8K', 'TQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
    '44', '33', '22'];
module.exports = {
    TableManager: TableManager
};

