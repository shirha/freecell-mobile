#!usr/bin/perl
# fcsolver.pl
  use warnings;
  use strict;
  use utf8;

#SN  perl -e "print join( ' ',map{(split/\|/)[1]} split/~/,(split/,/,<>)[-1] )" <upload.txt

  my $htm = << 'eof'
<!DOCTYPE html><head><title>Freecell in Miniature</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
#left   {float: left; width: 420px; margin: 25px 0 25px 25px; /* top, right, bottom, left */}
body    {background-color: #fff}
span    {color: red;}
div     {background: transparent;}
table   {border-collapse: collapse;}
th, td  {border: 1px solid #ddd;}
th      {background-color: #e7f6f8; font-weight: bold;}
td      {background-color: #f4f4f4; text-align: center;}
caption {background: #f4f4f4; font-weight: bold;}
</style></head><body><div id="left"><table>%s</table></div></body></html>
eof
;
  my %lut = ('C' => '♣', 'D' => '<span>♦</span>', 'H' => '<span>♥</span>', 'S' => '♠', 'T' => '10', 
            '|h|' => '|home|', '|f|' => '|freecell|', '|e|' => '|empty column|');

  print "\nPlease enter gameno: "; my $parm = <STDIN>;
  my $heap = $parm =~ /--maxnodes/ ? "12g" : "4g"; #note 25000 only needs 4g
  system("java -d64 -Xmx$heap -server -cp ../target/freecell-mobile-0.1-SNAPSHOT.jar org.games.solitaire.Batch --gameno $parm") unless $parm == 0;

  my $input;
  open( INPUT, "<", "upload.txt" ) or die "can't open input";
  while( $_ = <INPUT> ){ chomp; $input = $_ };
  close INPUT;
    
  my($gameno, $depth, $maxnodes, $os, $solution) = split /,/, $input;
  $solution =~ s/(C|D|H|S|T|\|h\||\|f\||\|e\|)/$lut{$1}/gse;

  die "interal error: parm != last game in upload.txt" unless $parm =~ /^$gameno/;

  open( OUTPUT, ">:encoding(UTF-8)", "fcsolver.htm" ) or die "can't open output";
  printf OUTPUT $htm, "<caption>Game#$gameno (Windows 8)</caption>\n<tr><th>No<th>SN<th>Move<th>To<th>Autoplay to home" .
    join "", map { "\n<tr>" . join "", map { "<td>$_" } split /\|/, $_, 5 } split /~/, $solution;
  close OUTPUT;

  `fcsolver.htm`;