var __alfabeat_v1_0_0 = (function(){

	'use strict';

	window.audioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext);
	window.requestAnimationFrame = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame);

	var context = undefined,
		bufferLoader = undefined,
		socket = undefined;

	var samples = [],
		sounds = [],
		hits = [],
		timeSince = [];

	var low = 5,
		max = 800,
		timeout = 0;

	var silhouette = undefined,
		indicators = undefined,
		disabled = [];

	// The sounds for Alfabeat are loaded alphabetically from the /which-sounds
	// endpoint of our Express app.
	// This function maps the sounds for each sensors
	// So, to make the fifth sound loaded play when the first sensor is hit
	// We return 5 when 0 is passed as the sensors idx.
	// To make the third sound loaded play when the second sensor is hit
	// We return 3 when 2 is passed as the sensors idx.
	// And so on...

	function mapSounds(sensor){

		// Sound mappings for 6 sensors
		// var soundsForPins = [5, 2, 1, 6, 5, 0, 5];

		// We only used four sensors
		var soundsForPins = [5, 6, 2, 3];

		return soundsForPins[sensor];

	}

	// Sourced from http://stackoverflow.com/questions/12484052/how-can-i-reverse-playback-in-web-audio-api-but-keep-a-forward-version-as-well
	function cloneAudioBuffer(audioBuffer){
		var channels = [],
		    numChannels = audioBuffer.numberOfChannels;

		//clone the underlying Float32Arrays
		for (var i = 0; i < numChannels; i++){
		    channels[i] = new Float32Array(audioBuffer.getChannelData(i));
		}

		//create the new AudioBuffer (assuming AudioContext variable is in scope)
		var newBuffer = context.createBuffer(
		                    audioBuffer.numberOfChannels,
		                    audioBuffer.length,
		                    audioBuffer.sampleRate
		                );

		//copy the cloned arrays to the new AudioBuffer
		for (var i = 0; i < numChannels; i++){
		    newBuffer.getChannelData(i).set(channels[i]);
		}

		return newBuffer;
	}

	// We need to play sounds really quickly and we don't want to stop
	// a sample as it's playing and set it back to 0 because it sounds 
	// terrible. Instead, we create audioBuffers from our sounds samples
	// and every time we want to play a sound we clone the buffer data
	// and use that so we don't have to load the sound again and again

	function playSound(idx){

		var src = context.createBufferSource(),
			newBuffer = cloneAudioBuffer(sounds[idx]);

		src.buffer = newBuffer;

		var gainNode = context.createGain();
		
		gainNode.gain.value = 1;

		src.connect(gainNode);
		gainNode.connect(context.destination);

		src.start(0);

	}

	// Every time our Arduino sends pin data to our Node app, it will
	// use socket.io to forward that information to our web audio sampler
	// Here, we bind a listener to the 'drums' channel to get the info
	// on which sensors have been hit and which haven't.

	function bindSocketEvents(){

		socket.on('drums', function(data){
			
			// Data should be something like : [0,0,0,1,0,1];

			var vals = data.values;

			// For every sensors, check if it's been hit and see if it's
			// been hit already. If it hasn't been hit already, play the sound
			// and register that it's been hit in the 'hits' array
			// If it has been hit, check whether or not the sensors has returned
			// to a state where it hasn't been hit, then reset it's 'hits' value
			// to false. 
			// timeSince, was a timeout value that we didn't need eventually

			for(var k = 0; k < vals.length; k += 1){

				if(vals[k] < low && hits[k] === false){
					hits[k] = true;

					if(performance.now() - timeSince[k] > timeout){
						timeSince[k] = performance.now();
						console.log(k);
						playSound(mapSounds(k));	
					}

					
				} else if(vals[k] > max && hits[k] === true){
					hits[k] = false;
				}

			}

		});

	}

	function addEvents(){

		// Tiny bit of code to check whether or not our sound samples have been
		// loaded. You can check by pressing the 1 and 2 keys to play 
		// the first and second sample

		window.addEventListener('keydown', function(e){

			switch(e.keyCode){

				case 49:
					playSound(5);
					break;
				case 50:
					playSound(6);
					break;
				default:
					break;
			}

		}, true);

	}

	function loadSamples(passedSamples){

		if(passedSamples === undefined){
			passedSamples = samples;
		}

		console.log(passedSamples);

		bufferLoader = new BufferLoader(context, passedSamples, function(list){

			sounds = list;
			console.log(sounds);
			bindSocketEvents();

		});

		bufferLoader.load();

	}

	function getSamples(cb){

		jQuery.ajax({
			type : "GET",
			url : "/which-sounds",
			success : function(data){

				for(var n = 0; n < data.files.length; n += 1){
					hits[n] = false;
					timeSince[n] = performance.now();
					disabled[n] = false;
				}

				cb(data.files);

			},
			error : function(e){

				console.error("An error occurred when we tried to get a list of sounds from the server");
				console.error(e);

			}
		});

	}

	function init(){
		
		context = new window.AudioContext();
		socket = io.connect(window.location.href);
		console.log(socket);

		silhouette = document.getElementById('silhouette');
		indicators = silhouette.getElementsByTagName('span');

		addEvents();

		getSamples(loadSamples);

	}

	return{
		init : init,
		sounds : sounds,
		play : playSound
	};

})();

(function(){
	__alfabeat_v1_0_0.init();
})();