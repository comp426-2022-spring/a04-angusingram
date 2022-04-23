const express = require('express');
const database = require('mime-db');
const morgan = require('morgan')
const fs = require('fs')
const app = express();
const args = require('minimist')(process.argv.slice(2))
var db = require("./database.js")
var HTTP_PORT = args['port'] || 5555




console.log(args)
// Store help text 
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}





app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Start server
const server = app.listen(HTTP_PORT, () => {
    console.log("Server running on port %PORT%".replace("%PORT%",HTTP_PORT))
});
// READ (HTTP method GET) at root endpoint /app/
app.get("/app/", (req, res, next) => {
    res.json({"message":"Your API works! (200)"});
	res.status(200);
});

// Define other CRUD API endpoints using express.js and better-sqlite3

app.use( (req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
}
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddress, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.user, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
    res.status(200).json(info)
    next()
});



if (args['debug'] == true) {
  app.get("/app/log/access", (req, res) => {	
    try {
        const stmt = db.prepare('SELECT * FROM accesslog').all()
        res.status(200).json(stmt)
    } catch {
        console.error(e)
    }
});

app.get("/app/error", (req, res) => {	
  throw new Error('Error test successful')
});

}

if (args['log'] == true) {


// Use morgan for logging to files
// Create a write stream to append (flags: 'a') to a file
const WRITESTREAM = fs.createWriteStream('access.log', { flags: 'a' })
// Set up the access logging middleware
app.use(morgan('combined', { stream: WRITESTREAM }))


}

/*
// READ a single user (HTTP method GET) at endpoint /app/user/:id
app.get("/app/user/:id", (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM userinfo WHERE id = ?').get(req.params.id);
        res.status(200).json(stmt)
    } catch (e) {
        console.error(e)
    }

});
*/
/*
UPDATE a single user (HTTP method PATCH) at endpoint /app/update/user/:id
app.patch("/app/update/user/:id", (req, res) => {
    let data = {
        user: req.body.username,
        pass: req.body.password
    }
    const stmt = db.prepare('UPDATE userinfo SET username = COALESCE(?,username), password = COALESCE(?,password) WHERE id = ?')
    const info = stmt.run(data.user, data.pass, req.params.id)
    res.status(200).json(info)
});
*/
/* DELETE a single user (HTTP method DELETE) at endpoint /app/delete/user/:id
app.delete("/app/delete/user/:id", (req, res) => {
    const stmt = db.prepare('DELETE FROM userinfo WHERE id = ?')
    const info = stmt.run(req.params.id)
    res.status(200).json(info)
});
*/
/* COMMENTED OUT BC HAVE NEW FOR A04
app.get('/app', (req, res) => {
  // Respond with status 200
      res.statusCode = 200
      res.statusMessage = 'OK'
  // Respond with status message "OK"
      res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
      res.end(res.statusCode+ ' ' +res.statusMessage)
});
*/
app.get('/app/flip', (req, res) => {
  var flip = coinFlip()
  res.status(200).json({ 'flip' : flip })

});

app.get('/app/flips/:number', (req, res) => {
  var flips = coinFlips(req.params.number)
  var summary = countFlips(flips)
  res.status(200).contentType('text/plain').json({ "raw" : flips, "summary" : summary})

});

app.get('/app/flip/call/:call', (req, res) => {
  res.status(200).contentType('text/plain').json(flipACoin(req.params.call))

});



// Default response for any other request
app.use(function(req, res){
	res.json({"message":"Endpoint not found. (404)"});
    res.status(404);
});
/*  IDK WHAT THIS DOES COMMENTING FOR NOW
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server stopped')
    })
})

*/








function coinFlip() {
    let min = 1;
    let max = 10;
    let x = Math.floor(Math.random() * (max - min + 1) + min);
    x = x % 2;
    if(x == 1) {
      return "heads";
    } else if (x == 0) {
      return "tails";
    }
}
  

  
function coinFlips(flips) {
    if (flips == null) {
      flips = 1;
    }
    let array = new Array(flips);
    for (let i = 0; i < flips; i++) {
      array[i] = coinFlip();
    }
    return array;
}

function countFlips(array) {
    let heads = 0;
    let tails = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i] == "heads") {
        heads++;
      } else {
        tails++;
      }
    }
    return "{'tails':'" + tails + ",'heads':'" + heads + "'}";
  }

function flipACoin(call) {
    if (call == "heads" || call == "tails") {
      let x = coinFlip();
      if (x == call) {
        return "{'call':" + call + "','flip':'" + x + "','result':'win'}"
      } else {
        return "{'call':'" + call + "','flip':'" + x + "','result':'lose'}"
      }
    }
    
    return "Error: no input \nUsage: node guess-flip --call=[heads|tails]"
  
  }
