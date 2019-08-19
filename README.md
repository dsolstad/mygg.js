# mygg.js
Inspired by Mosquito, MalaRIA and BeEF - mygg.js (Norwegian for mosquito) is a tool to proxy via cross-site scripting. It is small, simple, dependancy free and HTTPS supported. The reason to use a XSS proxy is to browse through the hooked browser, which will append authentication headers and httponly cookies automatically, that you would not otherwise get to retrieve with JavaScript.

# How to use
You should run mygg.js on a server online with a domain.  
Go over the configuration section at the top of the file and make sure eveything is in order.
```
$ node mygg.js
```
mygg.js will then output the payload which you inject in the XSS. Two ports will be opened on the server running mygg.js, which by default is 443 and 8000. 

# TODOs

* Seperate hooked browsers.
* Implement the use of websockets instead of HTTP polling.

# FAQ
Q: Why not use the other tools instead?  
A: Mosquito and MalaRIA are old and does not support HTTPS. BeEF is barely maintained and its XSS proxy is full of bugs.  
