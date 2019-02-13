var Discord = require('discord.io');
var logger = require('winston');
var auth = require('../auth.json');
var fs = require('fs');
var drole = 'START IT 4'; // Default role given to new joins
var startTime = new Date();
var timeout = 1; // Server message timeout in minutes

const { exec } = require('child_process');

var users = require('../users.json');
var helpMessage1 = "**Help/info for oracle bot.** \nMessages sent by the bot has a timeout of  " + timeout + ((timeout == 1) ? " minute" : " minutes") +"\n" + 
"The bot automatically deletes the invocing command\n" + 
"Available commands: \n" + 
"```\n" + 
"!ping - Use it to see if the bot is live.\n" + 
"!help - Display help info.\n" + 
"!obs - Post OBS download link\n" + 
"!moodle - Post moodle link\n" + 
"!vs - Post Visual Studio link\n" + 
"!ontime - Shows bot ontime in minutes\n" + 
"!fredag - Friday message\n```";
var helpMessage2 = "\nADMIN level commands:\n" + 
"```\n" +
"!REFRESH - Used to restart the bot server program.\n" +
"!PULL - Pulls the newest build from github.\n" +
"!REBOOT - Used to restart the bot server.\n" +
"!KILL - Shuts the bot down. \n" + 
"!REGISTER userID username admin(true/false) - Adds a user to local user register\n" +
"!REMOVE userID - Removes a user from the local user register\n" +
"!DELETE messageID - Removes a message with given ID from the chatroom\n" +
"!POSTLOG - Replies with the server log file\n" +
"!INVITE userID - if userID is given the server sends the invite to that user in pm, else it will post an invite link in chat\n" +
"!ALERT message - Posts a tts global message tagging users```";

var channels = {
    test: '540248332069765134',
    startIT4: null
}

logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
    writeLog('Startup', 'SERVER', true);
});

setTimeout(function() {
    msg(channels.test, 'Oracle startIT bot is now running');
}, 2000);

bot.on('guildMemberAdd', function(callback) { /* Event called when someone joins the server */
    if(callback.guild_id == channels.test)
      bot.addToRole({"serverID":channels.test,"userID":callback.id,"roleID":drole},function(err,response) {
        if (err) console.error(err); /* Failed to apply role */
    });
});

bot.on('message', function (user, userID, channelID, message, evt) {

})

bot.on('message', function (user, userID, channelID, message, evt) {
    
    if (message.substring(0,6) == 'SERVER') {
        writeLog('POST message ID: ' + evt.d.id, 'SERVER', true);
        setTimeout(function() {
            deleteMessage(channelID, evt.d.id);
            
        }, 1000*60*timeout);
    } else {
        writeLog('Message ID: ' + evt.d.id + ' \t Message: ' + message, 'LOG', true);
    }
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        args = args.splice(1);
        console.log('Run command: !'+cmd + "\n Invoked by: " + user + "\t ID: " + userID + "\n Additional arguments: " + args);
        var mode = users[userID].admin ? 'admin' : 'user';
        var outcome = false;

        if (!userID in users) {
            msg(channelID, 'Command invoked by unregistered user. Please regiser user using command !REGISTER');
            return;
        }

        switch(cmd) {
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'SERVER\n Pong!'
                });
                deleteMessage(channelID, evt.d.id);
                break;

            case 'DELETE':
                if(mode == 'admin') {
                    outcome = true;
                    if (args[0]) {
                        deleteMessage(channelID, args[0]);
                        msg(channelID, 'Message ID: ' + args[0] + ' Deleted');
                    } else {
                        msg(channelID, 'No ID given');
                    }
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'POSTLOG':
                if (mode == 'admin') {
                    outcome = true;
                    bot.uploadFile({
                        to: channelID,
                        file: '/var/getBot/GetBot2/log.txt',
                        message: 'SERVER\nServer post log'
                    }, function(err, res) {
                        if (err) {
                            errorOut(channelID, err);
                        }
                    })
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'INVITE':
                if (mode == 'admin'){
                    outcome = true;
                    channelID, bot.createInvite({
                        channelID: channelID,
                        max_age: (24*60*60),
                        max_users: 0,
                        temporary: false
                    }, function (err, res) {
                        if(err) {
                            errorOut(channelID, err);
                            return;
                        }
                        if(args[0]) {
                            msg(args[0], 'https://discord.gg/'+res.code, false);
                            msg(channelID, 'Invite sent to userID: ' + args[0]);
                        } else {
                            msg(channelID, '__**It\'s dangerous to go alone, take this:**__\nhttps://discord.gg/'+res.code);
                        }
                    })
                    
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'PULL':
                if (mode == 'admin') {
                    outcome = true;
                    msg(channelID, 'Pulling newest build');
                    exec('/var/getBot/GetBot2/pull.sh', (err, stdout, stderr) => {
                        if (err) {
                          // node couldn't execute the command
                          console.log('Exec failed');
                          errorOut(channels.test, 'Refresh failed.\n' + err);
                          return;
                        } else {
                            msg(channelID, 'Pull complete');
                        }
                      });
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'ontime':
                msg(channelID, 'Bot ontime: ' + Math.round(((new Date() - startTime)/1000)/60, 1) + ' minutes');
                deleteMessage(channelID, evt.d.id);
                break;

            case 'REBOOT':
                if (mode == 'admin') {
                    msg(channelID, 'REBOOTING SERVER PLEASE ALLOW ~1-5min FOR FULL REBOOT\n brb');
                    setTimeout(reboot, 1000);
                    outcome = true;
                } else {
                    errorOut(channelID, 'User not authorized');
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'REFRESH':
                if(mode == 'admin') {
                    msg(channelID, 'RESETTING BOT');
                    setTimeout(reset, 1000);
                    outcome = true;
                } else {
                    msg(channelID, 'You are not authorized for this command.');
                }
                deleteMessage(channelID, evt.d.id);
                break;
                
            case 'help':
                msg(channelID, helpMessage1);
                msg(channelID, helpMessage2);
                deleteMessage(channelID, evt.d.id);
                break;

            case 'KILL':
                if (mode == 'admin') {
                    msg(channelID, 'GOODBYE CRUEL WORLD!');
                    setTimeout(process.exit, 2000);
                    outcome = true;
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'REMOVE':
                var userArg = args[0];
                if (mode == 'admin' && userArg != userID){
                    removeUser(userArg);
                    outcome = true;
                } else if (!mode == 'admin') {
                    msg(channelID, 'You are not registered admin');
                } else {
                    msg(channelID, 'You cannot delete yourself');
                }
                deleteMessage(channelID, evt.d.id);
                break;

            case 'REGISTER':
                if (mode == 'admin') {
                    var givenID = args[0];
                    var givenName = args[1];
                    var adminStatus = args[2];
                    addUser(givenID, givenName, adminStatus, channelID);
                    outcome = true;
                } else {
                    msg(channelID, 'You are not registered admin');
                }
                console.log(users);
                deleteMessage(channelID, evt.d.id);
                break;


            case 'obs':
                msg(channelID, 'https://obsproject.com/download');
                deleteMessage(channelID, evt.d.id);
                break;

            case 'vs':
                msg(channelID, 'https://visualstudio.microsoft.com/');
                deleteMessage(channelID, evt.d.id);
                break;

            case 'moodle':
                msg(channelID, 'https://getacademy.moodlecloud.com/');
                deleteMessage(channelID, evt.d.id);
                break;
            
            case 'fredag':
                msg(channelID, '**__FREDAG__**\n\n```Husk å spille inn video av hva du har gjort denne uken. Husk å ta med hva du fikk til og hva du ikke fikk til. Videoen laster du opp til google photos eller youtube og sender Marius eller Geir linken.\n```');
                deleteMessage(channelID, evt.d.id);
                break;

            case 'ALERT':
                if (mode == 'admin') {
                    msg(channelID, '<@!everyone>HEISANN!');
                } else {
                    msg(channelID, 'You are not registered admin');
                }
                outcome = true;
                deleteMessage(channelID, evt.d.id);
                break;

            default:
                msg(channelID, 'Unknown command. Type !help for help text');
                deleteMessage(channelID, evt.d.id);
                break;

         }
         writeLog(cmd, user, outcome);
     }
});


function addUser(ID, name, admin, channel) {
    users[ID] = {
        name: name,
        admin: admin == 'true' ? true : false,
        channel: channel
    }
    msg(channel, 'User added to local register! \n```\nName: ' + name + '\nID: ' + ID + '\nAdministrator: ' + admin + '```');
    writeToJSON(users);
}

function msg(channel, msg, timeout=true, tts=true) {
    bot.sendMessage({
        to: channel,
        message: timeout ? 'SERVER\n' + msg: msg,
        tts: tts
    });
}

function errorOut(channel, text) {
    var errMsg = '__**ERROR!**__\n' + text;
    msg(channel, errMsg);
}

function removeUser(ID) {
    delete users[ID];
}

function writeToJSON(data) {
    fs.writeFileSync('../users.json', JSON.stringify(data));
}

function reboot() {
    console.log('Rebooting');
    var script = 'null';
    if (process.platform === 'win32') {
        script = 'reboot.bat';
    } else {
        script = '/var/getBot/GetBot2/reboot.sh';
    }
    exec(script, (err, stdout, stderr) => {
        if (err) {
            console.log('Exec failed');
            errorOut(channels.test, 'Reboot failed\n' + err);
            return;
        }
    });
}

function reset() {
    // Function is supposed to start an external batch script that kills the server, and restarts it
    console.log('Resetting');
    setTimeout(process.exit, 5000);
    var script = 'null';
    if (process.platform === 'win32') {
        script = '/var/getBot/GetBot2/reset.bat';
    } else if (process.platform === 'linux') {
        script = '/var/getBot/GetBot2/reset.sh';
    }
    exec(script, (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          console.log('Exec failed');
          errorOut(channels.test, 'Reset failed.\n' + err)
          return;
        }
      });
}

function writeLog(action, user, authenticated) {
    var logString = new Date().toLocaleString() + '\t - \t Action: ' + action + '\t \t User: ' + user + '\t \t Authenticated: ' + authenticated + '\n';
    fs.appendFile('log.txt', logString, function(err) {
        if (err) throw err;
    });
}

function deleteMessage(channel, message) {
    bot.deleteMessage({
        channelID: channel,
        messageID: message
    });
    console.log('Mesage id: '+ message + ' Deleted from channel: ' + channel);
}

