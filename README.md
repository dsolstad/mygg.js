# mygg.js
You got an XSS, but are unable to pop the session cookies? Inspired by Mosquito, MalaRIA and BeEF - mygg.js (*Norwegian for mosquito*) is a tool to proxy web traffic via cross-site scripting. By abusing session riding, authentication tokens will automatically be appended to each request by the "victim" browser, enabling the "attacker" to browse as though they were authenticated.

<img src="https://github.com/dsolstad/mygg.js/blob/master/diagram.png" alt="drawing" width="698" height="320"/>

# Download and setup

The server running mygg.js needs to be reachable from the hooked web browser, which means that the mygg.js server needs to be exposed directly on the Internet, unless the victim is on the same network as the mygg.js server.
 
The only prerequisite is to have NodeJS above v10, Busboy formData library, OpenSSL and be able to run mygg.js as root.

```
apt install nodejs npm openssl
npm install busboy
wget https://raw.githubusercontent.com/dsolstad/mygg.js/master/mygg.js
```

# Configuration
In the top of the mygg.js file, there are some configuration parameters. The only thing you really need to change is the domain parameter. If you don't have a domain, change domain to the IP address of the server hosting mygg.js.

## Self-signed certificate
When you start mygg.js, it will automatically generate a self-signed certificate, but remember that the victim browser needs to accept the self-signed certificate to load the hook and communicate with mygg.js. This means that from the victim browser, you first need to browse to the attacking mygg.js server to accept the certificiate. 

## Let's Encrypt
To use a legitimate CA instead of self-signed, you can use Let's Encrypt against a domain you control:
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
    domain: 'example.com',
    http_interface: '0.0.0.0',
    https_interface: '0.0.0.0',
    http_port: 80,
    https_port: 443,
    polling_time: 2000,
    key: '/etc/letsencrypt/live/privkey.pem',
    cert: '/etc/letsencrypt/live/fullchain.pem',
    debug: 0,
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
Three ports will be opened on the server running mygg.js, which by default is 80, 443 and 8081. 

+ Port 80 - Used for serving the hook, polling and receiving responses, over HTTP.
+ Port 443 - Used for serving the hook, polling and receiving responses, over HTTPS. 
+ Port 8081 - The proxy where you should configure your attacking web browser to proxy through, to forward communication to the hooked browser.
  
When browsing through the proxy, use http:// instead of https://. If your browser forces over to https, then clear the HSTS cache in your browser by doing the following:
  
+ Firefox: ctrl+shift+h -> Right click on the target website and hit "Forget about this site" -> Restart Firefox.  
+ Chrome: Visit chrome://net-internals/#hsts -> scroll down to "Delete domain security policies" -> Enter domain.

Normally you will only be able to browse the website where the hook was loaded, due to same-origin-policy. However, some sites are misconfigured, i.e. by having an open access-control-allow-origin header, which can make it possible to browse those too.
  
You might see some errors in the JavaScript console of the hooked browser, but don't worry, it is supposed to be like that.

# TODOs

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
