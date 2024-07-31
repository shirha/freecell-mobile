# freecell-mobile

NOTE: target\freecell-mobile-0.1-SNAPSHOT.jar removed, now see repository "freecell"

The UI for freecell-solver !

#### Installation and setup instructions

* download and unzip the package

Note: To prevent a Windows "Security Warning", right-click freecell.bat, choose Properties and in the General tab, click the 'Unblock' button.

* double-click the freecell.bat

This will start-up a local webserver and open a browser to http://localhost:8080

read the "instructions.html" and play in fullscreen (F11) on the browser

Enjoy!

PS. Now there is a web worker solver.js as well.  The web page will pick the java localhost server if available or the web worker otherwise. 
Chrome does not allow web workers from the local file system with out starting chrome.exe with --allow-file-access-from-files

-

build the target jar file with `mvn clean install' or export > java > runnable jar > with Main class: org.games.solitaire.Jetty


