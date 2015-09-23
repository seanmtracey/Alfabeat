var express = require('express'),
	app = express(),
	port = 8118,
	server = app.listen(port),
	fs = require('fs'),
	serialport = require('serialport'),
	io = require('socket.io').listen(server, { log: false });

for(var _ = 0; _ < process.argv.length; _ += 1){

	if(process.argv[_] === "--port" || process.argv[_] === "-port" || process.argv[_] === "-p"){

		if(process.argv[ _ + 1 ] !== undefined){
			port  = process.argv[_ + 1];
			break;
		}

	}

}

app.use(express.static(__dirname + '/public'));
app.use('/demo', express.static(__dirname + '/demo'));
app.use('/sounds', express.static(__dirname + '/sounds'));

app.all('*', function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  next();
 });

console.log("Server started.\nAvailable on localhost:" + port);

// When this endpoint is hit, we read all of the files in the /sounds folder
// of the project and send the list back to the client as a JSON response
// The client then loads the resources statically.

app.get('/which-sounds', function(req, res){

	var files = fs.readdir(__dirname + '/sounds', function(error, files){

		console.log(files);

		var fullPathFiles = [];

		for(var x = 0; x < files.length; x += 1){

			fullPathFiles[x] = '/sounds/' + files[x]; 

		}

		res.json({
			files : fullPathFiles
		});

	});

});

app.get('/test-stop', function(req, res){

	clearInterval(t);

	res.send("Test Ended");

});

app.get('/test-data', function(req, res){

	t = setInterval(function(){

		var spoofData = [0,0,0,0,0,0];

		for(var s = 0;  s < spoofData.length; s += 1){

			spoofData[s] = Math.random() * 1000 | 0;

			(Math.random() < 0.3) ? spoofData[s] = 0 : spoofData[s] = spoofData[s];

		}

		console.log(spoofData);

		io.sockets.emit('drums', {
			values : spoofData
		});

	}, 5);

	res.send("Running Test");

});


io.sockets.on('connection', function (socket) {

	console.log("A connection was made over WebSockets");

});

function handleDevice(err, ports){

	console.log("\nAvailable serial devices:\n");

	// Not everyone understands or knows how to access the details of devices that can 
	// connect with a serial port, so we'll give them a handy list they can choose from.

	for(var g = 0; g < ports.length; g += 1){

		console.log("\t" + g + ") " + ports[g].comName);

	}

	var stdin = process.stdin, stdout = process.stdout;

	stdin.resume();
	stdout.write("\nEnter the number of the device you would like to use or enter 'r' to reload the list: ");

	stdin.once('data', function(data) {

		if(data.toString().trim() === "r"){
			console.log("\nGetting list of devices...");
			serialport.list(handleDevice);
			return;	
		}

		var deviceNumber = parseInt(data);

		if(deviceNumber > ports.length - 1 || deviceNumber < 0){
			console.log("That isn't a valid number... Exiting script...");
			process.exit(0);
		}

		console.log("Attempting to connect to device: " + deviceNumber);

		// Connect to the Arduino using the serial port. The \n delimiter will act as EOI for each data burst

		var serialConnection = new serialport.SerialPort(ports[deviceNumber].comName, {
		  baudrate: 115200,
		  parser: serialport.parsers.readline("\n")
		}, false);

		var avgCount = 0,
			avgAmt = 20,
			averages = [];

		// Open a connection to the Arduino to access the serial data it's streaming out

		serialConnection.open(function(err){

			if(err){
				console.log("An error occurred connecting to the Arduino... Exiting script...");
				console.log("The error was:\n\t", err);
				process.exit(1);
			}

			console.log("Opened serial connection to Arduino");

			// When we get data, split the string up into an array every time there is a space 

			serialConnection.on('data', function(data){

				// 'data' should look something like "3 1024 80 248 1 1 0"
				// One value for each analog pin registered;

				var d = data.split(' ');

				// The last value is \n. Get rid of it.
				d.pop();

				// We want to send the average of a number of reading over time to our client
				// If this is the first time in this loop that we're recieveing data, reset the array
				// values to 0

				if(avgCount === 0){

					for(var g = 0; g < d.length; g += 1){
						averages[g] = 0;
					}

				}

				// If we have not yet got enough values to make an average, add the latest value to the
				// averages array.

				if(avgCount < avgAmt){

					for(var j = 0; j < d.length; j += 1){

						averages[j] += parseInt(d[j]);

					}

					avgCount += 1;

				} else if(avgCount === avgAmt){

					// If we do have enough values to get an average reading, divivd the values by the 
					// number of samples taken and round them off ( '| 0' does the rounding)

					for(var k = 0; k < averages.length; k += 1){

						averages[k] = parseInt(averages[k] / avgAmt) | 0;

					}

					// Send the data to all listening clients and reset the values

					io.sockets.emit('drums', {
						values : averages
					});

					avgCount = 0;
					averages = [];

				}
				

			});

		});

	});

}

serialport.list(handleDevice);
