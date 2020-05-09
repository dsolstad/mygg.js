# mygg.js
Inspired by Mosquito, MalaRIA and BeEF - mygg.js (*Norwegian for mosquito*) is a tool, written in Node/JavaScript, to proxy web traffic via cross-site scripting. It is small, simple, dependancy free, easy to configure and HTTPS-supported. The reason to use a XSS proxy is to browse through hooked browsers, which will append authentication headers, including cookies (even with httponly) automatically, that you would not otherwise get to retrieve with JavaScript.

<img src="https://github.com/dsolstad/mygg.js/blob/master/diagram.png" alt="drawing" width="698" height="320"/>

# Setup

## Download
```
apt install nodejs
wget https://raw.githubusercontent.com/dsolstad/mygg.js/master/mygg.js
```

## Configuration
In the top of the mygg.js file, there are some configuration parameters. If the target website is running over plain HTTP, you only need to change the *web_domain* parameter to the IP-address of the server hosting mygg.js, and then you can skip to the Start section.
  
If the target website is only supporting HTTPS, then you need to change the *web_protocol* parameter to 'https' and *web_port* to 443.
  
To get a certificate, there are two options: Self-signed or a legitimate CA. The easiest is to use a self-signed certificated, but remember that the victim browser needs to accept the self-signed certificate to load the hook and communicating with mygg.js.

Run the following commands in the same folder as where mygg.js resides to generate a self-signed certificate:
```
openssl genrsa -des3 -out server.orig.key 2048
openssl rsa -in server.orig.key -out server.key
openssl req -new -key server.key -out server.csr
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt 
```

Example config using self-signed certificate, where 192.168.1.2 is the server hosing mygg.js:
```const config = {
    web_domain: '192.168.1.2',           
    web_interface: '192.168.1.2',
    web_port: 443,
    web_protocol: 'https',
    polling_time: 2000,
    key: './server.key',
    cert: './server.crt',
    proxy_interface: '127.0.0.1',
    proxy_port: 8081,
    proxy_allowed_ips: ['127.0.0.1'],
}
```

To use a legitimate CA instead, you can use Let's Encrypt:
```
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone --preferred-challenges http -d example.com
```
The certificate and key files should now be located in /etc/letsencrypt/live/example.com. Change the *web_domain* parameter to 'example.com'. The *key* and *cert* parameters should point to the files generated from certbot.

Example config using Let's Encrypt, where example.com is the server hosting mygg.js:
```const config = {
    web_domain: 'example.com,           
    web_interface: '0.0.0.0',
    web_port: 443,
    web_protocol: 'https',
    polling_time: 2000,
    key: '/etc/letsencrypt/live/privkey.pem',
    cert: '/etc/letsencrypt/live/fullchain.pem',
    proxy_interface: '127.0.0.1',
    proxy_port: 8081,
    proxy_allowed_ips: ['127.0.0.1'],
}
```
  
## Start
```
node mygg.js
```
When mygg.js is started, it will output the payload which you insert in the target website, e.g. via Cross-site scripting.
Two ports will be opened on the server running mygg.js, which by default is 443 and 8081. Port 443 is used for serving the hook, polling and receiving responses. Port 8081 is where you should configure your attacking web browser to proxy through, to forward communication to the hooked browser.
  
When browsing through the proxy, use http:// instead of https://. If your browser forces over to https, then clear the HSTS cache in your browser.  
Firefox: ctrl+shift+h -> Right click on the target website and hit "Forget about this site" -> Restart Firefox.  
Chrome: Visit chrome://net-internals/#hsts -> scroll down to "Delete domain security policies" -> Enter domain.

# TODOs

* Fix base64 conversion problem on images.
* Consider implementing the use of websockets instead of HTTP polling.
* Consider implementing HTTPS interception instead of HTTPS downgrading.

# FAQ
Q: Why not use the other tools instead?  
A: Mosquito and MalaRIA are old and does not support HTTPS. BeEF is barely maintained and its XSS proxy is full of bugs. 

# Disclaimer 
This software is only meant to be used for the purposes of creating proof-of-concepts during security assessments, to better demonstrate the risks of Cross-site Scripting, and is not intended to be used to attack systems except where explicitly authorized. Project maintainers are not responsible or liable for misuse of the software. Use responsibly.
  
This software is a personal project and not related with any companies, including Project owner and contributors employers.

# LICENSE
  
GPLv3
