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

// io.set('origins', '*:*');

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

io.sockets.on('connection', function (socket) {

	console.log("A connection was made over WebSockets");

});



serialport.list(function (err, ports) {

	console.log("\nAvailable serial devices:\n");

	ports.forEach(function(port) {
		console.log(port.comName);
	});

	console.log('\n');

});

// Connect to the Arduino using the serial port. The \n delimiter will act as EOI for each data burst

var serialConnection = new serialport.SerialPort("/dev/tty.usbmodem1411", {
  baudrate: 115200,
  parser: serialport.parsers.readline("\n")
}, false);

var avgCount = 0,
	avgAmt = 20,
	averages = [];

// Open a connection to the Arduino to access the serial data it's streaming out

serialConnection.open(function(err){

	if(err){
		console.log("An error occurred connecting to the Arduino");
		console.log(err);
		return;
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
