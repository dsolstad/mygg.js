# mygg.js
Inspired by Mosquito, MalaRIA and BeEF - mygg.js (Norwegian for mosquito) is a tool to proxy via cross-site scripting. It is small, simple, dependancy free and HTTPS supported. The reason to use a XSS proxy is to browse through the hooked browser, which will append authentication headers and httponly cookies automatically, that you would not otherwise get to retrieve with JavaScript.

# How to use
```
$ node mygg.js
```

# FAQ
Q: Why not use the other tools instead?  
A: Mosquito and MalaRIA are old and does not support HTTPS. BeEF is barely maintained and its XSS proxy is full of bugs.  
