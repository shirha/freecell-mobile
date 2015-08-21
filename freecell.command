#!/bin/sh

# mac os-x installation instructions

# download to home directory and unzip package 
# then in a terminal, run "chmod +x freecell.command"
# now you should be able to run "Freecell" from finder
#

`safari 'http://localhost:8080'`

#
# java -jar command requires the java SDK
#  on your system, the jre is not enough
#

java -jar target/freecell-mobile-0.1-SNAPSHOT.jar