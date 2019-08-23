# mygg.js
Inspired by Mosquito, MalaRIA and BeEF - mygg.js (Norwegian for mosquito) is a tool to proxy via cross-site scripting. It is small, simple, dependancy free, easy to configure and HTTPS-supported. The reason to use a XSS proxy is to browse through the hooked browser, which will append authentication headers, including cookies (even with httponly) automatically, that you would not otherwise get to retrieve with JavaScript.

# How to use
You should run mygg.js on a Internet-facing server with a domain pointing to it.  
If you do not have valid certificate to the domain, then you can use Let's Encrypt:
```
$ sudo add-apt-repository ppa:certbot/certbot
$ sudo apt update
$ sudo apt install certbot
$ sudo certbot certonly --standalone --preferred-challenges http -d example.com
```
The certificate and key files should now be located in /etc/letsencrypt/live/example.com.  
Configure mygg.js in the top section of the file accordingly and make sure it points to the right files.  
  
Start mygg.js:
```
$ node mygg.js
```
mygg.js will then output the payload which you insert in target website. 
Two ports will be opened on the server running mygg.js, which by default is 443 and 8081. Port 443 is used for serving the hook, polling and receiving responses. Port 8081 is a proxy that forwards communication to the hooked browser. Configure your browser to proxy through the latter port.

# TODOs

* Seperate hooked browsers.
* Consider implementing the use of websockets instead of HTTP polling.

# FAQ
Q: Why not use the other tools instead?  
A: Mosquito and MalaRIA are old and does not support HTTPS. BeEF is barely maintained and its XSS proxy is full of bugs.  
