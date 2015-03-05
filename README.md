scuba.js
=================
Find the complete scuba.js documentation under: [http://mydea.github.io/scubajs/](http://mydea.github.io/scubajs/)

##What is scuba.js?
Scuba.js is a library which makes it easy to make existing or new REST-based web apps offline capable. It fetches data from the server, saves it locally in IndexedDB, and routes all $.ajax() calls to use the local data. POST, PUT and DELETE requests are stored in a queue and sent to the server in order when the client is back online.

The main goal of scuba.js was to enable developers to make their web apps offline capable without the need to completely rework their APIs or JavaScript code. If your web app uses $.ajax() for all Ajax calls, you just have to setup scuba.js and everything should work without any further changes!

##Tests
You can run the tests yourself by running ```grunt serve``` and visiting [http://localhost:8000/test](http://localhost:8000/test) or by running ```grunt test```.

##Author
scuba.js has been created by Francesco Novy | http://www.fnovy.com | hello@fnovy.com | @_fnovy

##Copyright
Copyright © 2015 Francesco Novy | MIT license