var Discord = require('discord.io');
var logger = require('winston');
var auth = require('../auth.json');
var fs = require('fs');
var drole = 'START IT 4'; // Default role given to new joins

const { exec } = require('child_process');

var users = require('../users.json');
var helpMessage1 = "Available commands: \n" + 
"```\n" + 
"!ping - Use it to see if the bot is live.\n" + 
"!help - Display help info.\n" + 
"!obs - Post OBS download link\n" + 
"!moodle - Post moodle link\n" + 
"!vs - Post Visual Studio link\n" + 
"!fredag - Friday message\n```";
var helpMessage2 = "\nADMIN level commands:\n" + 
"```\n" +
"!REFRESH - Used to restart the bot server program.\n" +
"!REBOOT - Used to restart the bot server.\n" +
"!KILL - Shuts the bot down. \n" + 
"!REGISTER userID username admin(true/false) - Adds a user to local user register\n" +
"!REMOVE userID - Removes a user from the local user register\n" +
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
    bot.getAllUsers(function(err) {
        if (err) errorOut(channels.test, 'User aquisition failed');
    })
}, 2000);

bot.on('guildMemberAdd', function(callback) { /* Event called when someone joins the server */
    if(callback.guild_id == channels.test)
      bot.addToRole({"serverID":channels.test,"userID":callback.id,"roleID":drole},function(err,response) {
        if (err) console.error(err); /* Failed to apply role */
    });
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
                    message: 'Pong!'
                });
                break;

            case 'REBOOT':
                if (mode == 'admin') {
                    msg(channelID, 'REBOOTING SERVER PLEASE ALLOW ~1-5min FOR FULL REBOOT\n brb');
                    setTimeout(reboot, 1000);
                } else {
                    errorOut(channelID, 'User not authorized');
                }
                break;
            case 'REFRESH':
                if(mode == 'admin') {
                    msg(channelID, 'RESETTING BOT');
                    setTimeout(reset, 1000);
                } else {
                    msg(channelID, 'You are not authorized for this command.');
                }
                outcome = true;
                break;

            case 'help':
                msg(channelID, helpMessage1);
                msg(channelID, helpMessage2);
                break;

            case 'KILL':
                if (mode == 'admin') {
                    msg(channelID, 'GOODBYE CRUEL WORLD!');
                    setTimeout(process.exit, 2000);
                }
                outcome = true;
                break;

            case 'REMOVE':
                var userArg = args[0];
                if (mode == 'admin' && userArg != userID){
                    removeUser(userArg);
                } else if (!mode == 'admin') {
                    msg(channelID, 'You are not registered admin');
                } else {
                    msg(channelID, 'You cannot delete yourself');
                }
                outcome = true;
                break;

            case 'REGISTER':
                if (mode == 'admin') {
                    var givenID = args[0];
                    var givenName = args[1];
                    var adminStatus = args[2];
                    addUser(givenID, givenName, adminStatus, channelID);
                } else {
                    msg(channelID, 'You are not registered admin');
                }
                console.log(users);
                outcome = true;
                break;

            case 'obs':
                msg(channelID, 'https://obsproject.com/download');
                break;

            case 'vs':
                msg(channelID, 'https://visualstudio.microsoft.com/');
                break;

            case 'moodle':
                msg(channelID, 'https://getacademy.moodlecloud.com/');
                break;
            
            case 'fredag':
                msg(channelID, '**__FREDAG__**\n\n```Husk å spille inn video av hva du har gjort denne uken. Husk å ta med hva du fikk til og hva du ikke fikk til. Videoen laster du opp til google photos eller youtube og sender Marius eller Geir linken.\n```');
                break;

            case 'ALERT':
                if (mode == 'admin') {
                    msg(channelID, 'HEISANN!', true);
                } else {
                    msg(channelID, 'You are not registered admin');
                }
                outcome = true;
                break;

            default:
                msg(channelID, 'Unknown command. Type !help for help text');
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

function msg(channel, msg, tts=false) {
    bot.sendMessage({
        to: channel,
        message: msg,
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
    fs.writeFileSync('./users.json', JSON.stringify(data));
}

function reboot() {
    console.log('Rebooting');
    var script = 'null';
    if (process.platform === 'win32') {
        script = 'reboot.bat';
    } else {
        script = './reboot.sh';
    }
    exec(script, (err, stdout, stderr) => {
        if (err) {
            console.log('Exec failed');
            errorOut(channels.test, 'Reboot failed');
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
        script = './reset.bat';
    } else if (process.platform === 'linux') {
        script = './reset.sh';
    }
    exec(script, (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          console.log('Exec failed');
          errorOut(channels.test, 'Reset failed.')
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
}