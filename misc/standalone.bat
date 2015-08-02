rem  NOTE - If you enter 0 for gameno, then solver uses the input.txt file for position to solve

SET /P NUM=Select game: 
java -d64 -Xmx6g -server -cp target/freecell-mobile-0.1-SNAPSHOT.jar org.games.solitaire.Batch --gameno %NUM% --maxnodes 25000
pause