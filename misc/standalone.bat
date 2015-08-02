rem  NOTE - If you enter 0 for game, then solver uses input.txt file for position

SET /P NUM=Select game: 
java -d64 -Xmx6g -server -cp target/fcsolver-rs-0.1-SNAPSHOT.jar org.games.solitaire.Batch --gameno %NUM% --maxnodes 20000
pause