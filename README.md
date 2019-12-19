# mygg.js
Inspired by Mosquito, MalaRIA and BeEF - mygg.js (*Norwegian for mosquito*) is a tool, written in Node/JavaScript, to proxy web traffic via cross-site scripting. It is small, simple, dependancy free, easy to configure and HTTPS-supported. The reason to use a XSS proxy is to browse through hooked browsers, which will append authentication headers, including cookies (even with httponly) automatically, that you would not otherwise get to retrieve with JavaScript.

<img src="https://github.com/dsolstad/mygg.js/blob/master/diagram.png" alt="drawing" width="698" height="320"/>

# How to use
You should run mygg.js on a Internet-facing server with a domain pointing to it.  
If you do not have valid certificate to the domain, then you can use Let's Encrypt:
```
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone --preferred-challenges http -d example.com
```
The certificate and key files should now be located in /etc/letsencrypt/live/example.com.  
  
Or you can use a self-signed certificate, but note that the victim browser needs to accept the self-signed certificate for the browser to load the hook.
```
openssl genrsa -des3 -out server.orig.key 2048
openssl rsa -in server.orig.key -out server.key
openssl req -new -key server.key -out server.csr
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt 
```
If the target website is running over plain HTTP, then you can skip the certificate part, but remember to change the protocol parameter in the configuration.

Download:
```
wget https://raw.githubusercontent.com/dsolstad/mygg.js/master/mygg.js
```
Configure mygg.js in the top section of the file accordingly and make sure it points to the right files.  
  
Start:
```
node mygg.js
```
mygg.js will then output the payload which you insert in the target website. 
Two ports will be opened on the server running mygg.js, which by default is 443 and 8081. Port 443 is used for serving the hook, polling and receiving responses. Port 8081 is a proxy that forwards communication to the hooked browser. Configure your browser to proxy through the latter port.
  
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
