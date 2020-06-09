# mygg.js
Inspired by Mosquito, MalaRIA and BeEF - mygg.js (*Norwegian for mosquito*) is a tool, written in Node/JavaScript, to proxy web traffic via cross-site scripting. It is small, simple, easy to configure and HTTPS-supported. The reason to use a XSS proxy is to browse through hooked browsers, which will append authentication headers, including cookies (even with httponly) automatically, that you would not otherwise get to retrieve with JavaScript.

<img src="https://github.com/dsolstad/mygg.js/blob/master/diagram.png" alt="drawing" width="698" height="320"/>

# Download and setup

The server running mygg.js needs to be reachable from the hooked web browser, which means that the mygg.js server needs to be exposed directly on the Internet, unless the victim is on the same network as the mygg.js server.
 
The only prerequisite is to have NodeJS above v8.11.2, Busboy formData library and be able to run mygg.js as root.

```
apt install nodejs npm
npm install busboy
wget https://raw.githubusercontent.com/dsolstad/mygg.js/master/mygg.js
```

# Configuration

## HTTP / HTTPS
In the top of the mygg.js file, there are some configuration parameters. If the target website is running over plain HTTP, you only need to change the *web_domain* parameter to the IP-address of the server hosting mygg.js, and then you can skip to the Start section.
  
If the target website is only supporting HTTPS, then you need to change the *web_protocol* parameter to 'https' and *web_port* to 443.

## Certificate
If you need to support HTTPS, then you need a certificate, where there are two options: Self-signed or a legitimate CA. The easiest is to use a self-signed certificated, but remember that the victim browser needs to accept the self-signed certificate to load the hook and communicate with mygg.js. This means that from the victim browser, you first need to browse to the attacking mygg.js server to accept the certificiate. 

### Self-signed
Run the following commands in the same folder as where mygg.js resides to generate a self-signed certificate:
```
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server-csr.pem
openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem
```

Example config using self-signed certificate, where 192.168.1.2 is the server hosting mygg.js:
```
const config = {
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

### Let's Encrypt
To use a legitimate CA instead, you can use Let's Encrypt against a domain you control:
```
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone --preferred-challenges http -d example.com
```
The certificate and key files should now be located in /etc/letsencrypt/live/example.com. Change the *web_domain* parameter to 'example.com'. The *key* and *cert* parameters should point to the files generated from certbot.

Example config using Let's Encrypt, where example.com is the server hosting mygg.js:
```
const config = {
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
  
# Start
```
node mygg.js
```
When mygg.js is started, it will output the payload which you insert in the target website, e.g. via Cross-site scripting.
Two ports will be opened on the server running mygg.js, which by default is 80 and 8081. Port 80 is used for serving the hook, polling and receiving responses. Port 8081 is where you should configure your attacking web browser to proxy through, to forward communication to the hooked browser.
  
When browsing through the proxy, use http:// instead of https://. If your browser forces over to https, then clear the HSTS cache in your browser.
  
Firefox: ctrl+shift+h -> Right click on the target website and hit "Forget about this site" -> Restart Firefox.  
Chrome: Visit chrome://net-internals/#hsts -> scroll down to "Delete domain security policies" -> Enter domain.

Normally you will only be able to browse the website where the hook was loaded, due to same-origin-policy. However, some sites are misconfigured, i.e. by having an open access-control-allow-origin header, which can make it possible to browse those too.
  
You might see some errors in the JavaScript console of the hooked browser, but don't worry, it is supposed to be like that.

# TODOs

* Automate generation of self-signed certificate.
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
