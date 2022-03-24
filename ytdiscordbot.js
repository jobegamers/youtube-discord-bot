const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const ytSearch = require('yt-search');


const client = new Discord.Client();

//map for queue 
const queue = new Map();

//client status
client.once("ready", () => {
  console.log("Ready");
});

client.once("reconnecting", () => {
  console.log("Reconnecting");
});

client.once("disconnect", () => {
  console.log("Disconnect");
});

//read messages listener
client.on("message", async message => {
  if (message.author.bot) return;  //return if message is from bot
  if (!message.content.startsWith(prefix)) return;   //return if no prefix

  //split message by spaces, store into an array and lowercase
  const args = message.content.split(" ");
  args[0] = args[0].toLowerCase();

  //check which command to execute
  const serverQueue = queue.get(message.guild.id);
  if (args[0] == (`${prefix}play`)) {
    play(args, message, serverQueue);
    return;
  } else if (args[0] == (`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (args[0] ==(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (args[0] ==(`${prefix}help`)) {
	help(message, serverQueue);
	return;
  } else {
    message.channel.send("You need to enter a valid command ya fuckin mouthbreather  \n Type /help for command options");
  }
});



//main play function
async function play(args, message, serverQueue) {
  let song = {};

  //check if user is in voice chat and bot permissions
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to use me...god damn wtf"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Permissions needed to join and speak in your voice channel"
    );
  }

    
	if (args[1] == null) {  //check for 2nd argument
		return message.channel.send("You can't just type /play... add a song url or a search term ya fuckin mouthbreather \n Type /help for command options");
	} else if (ytdl.validateURL(args[1])) {  //play song from url
     //get song info and save to sound object
     const songInfo = await ytdl.getInfo(args[1]);
     song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
	 };
  } else {  //search for song 
	  args.shift();
	  const songSearch = async (query) =>{
	  const songResult = await ytSearch(query);
	  return (songResult.videos.length > 1) ? songResult.videos[0] : null;
	  }
  
      const video = await songSearch(args.join(' '));
      if (video){
	  song = { title: video.title, url: video.url }
  } else {  //exception 
	  message.channel.send("Couldn't find the fucking song");
	  return;
     }
  }


  //add song to queue
  if (!serverQueue) {
	//contract for queue 
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };


	//set queue to use contract
    queue.set(message.guild.id, queueContruct);

	//push song into song array
    queueContruct.songs.push(song);

    try {
	  //try to join voice and save connection
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
	  //call play function to start song
      stream(message.guild, queueContruct.songs[0]);
    } catch (err) {
	  //print error message if fail to join
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue, just for you, so go get screwed`);
  }
}

//skip function
function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("Theres no song to skip you fucking tard");
  serverQueue.connection.dispatcher.end();
}

//stop function
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("Theres no song to stop for fucks sake");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

//help function
function help(message, serverQueue)  {
	 return message.channel.send(
	"__**Commands for you tards to use**__ \n \n /play YouTube link or search term \n /skip \n /stop \n \n If you have issues or recommendations let me know - jobegamers"
	);
	
}


//stream function
function stream(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  
  try {
  //create stream and pass the url of the song
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, { filter:"audioonly", type: 'opus', highWaterMark: 1<<25 }))
    .on("finish", () => {
      serverQueue.songs.shift();
      stream(guild, serverQueue.songs[0]);
    })
    .on("error", () => {
        serverQueue.songs.shift();
        stream(guild, serverQueue.songs[0]);
    });
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Playing - **${song.title}**`);
  }
   catch (err) {
	   return;
   }
  
}

client.login(token);
