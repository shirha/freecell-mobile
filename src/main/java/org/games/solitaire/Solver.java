/*
 * Copyright 2013 Shirl Hart
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the the Artistic License (2.0). You may obtain a copy
 * of the full license at:
 *
 * http://www.perlfoundation.org/artistic_license_2_0
 *
 * Any use, modification, and distribution of the Standard or Modified
 * Versions is governed by this Artistic License. By using, modifying or
 * distributing the Package, you accept this license. Do not use, modify, or
 * distribute the Package, if you do not accept this license.
 *
 * If your Modified Version has been derived from a Modified Version made by
 * someone other than you, you are nevertheless required to ensure that your
 * Modified Version complies with the requirements of this license.
 *
 * This license does not grant you the right to use any trademark, service
 * mark, tradename, or logo of the Copyright Holder.
 *
 * This license includes the non-exclusive, worldwide, free-of-charge patent
 * license to make, have made, use, offer to sell, sell, import and otherwise
 * transfer the Package with respect to any patent claims licensable by the
 * Copyright Holder that are necessarily infringed by the Package. If you
 * institute patent litigation (including a cross-claim or counterclaim)
 * against any party alleging that the Package constitutes direct or
 * contributory patent infringement, then this Artistic License to you shall
 * terminate on the date that such litigation is filed.
 *
 * Disclaimer of Warranty: THE PACKAGE IS PROVIDED BY THE COPYRIGHT HOLDER
 * AND CONTRIBUTORS "AS IS' AND WITHOUT ANY EXPRESS OR IMPLIED WARRANTIES.
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE, OR NON-INFRINGEMENT ARE DISCLAIMED TO THE EXTENT PERMITTED BY
 * YOUR LOCAL LAW.  UNLESS REQUIRED BY LAW, NO COPYRIGHT HOLDER OR
 * CONTRIBUTOR WILL BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, OR
 * CONSEQUENTIAL DAMAGES ARISING IN ANY WAY OUT OF THE USE OF THE PACKAGE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * */

package org.games.solitaire;

import java.io.FileWriter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import com.google.common.base.Joiner;
import com.google.common.collect.Iterables;

public class Solver {

	private int gameno;
	private int maxnodes = 2000;
	private int blocksolve = 1;
	private boolean winxp = false;
	private boolean showall = false;
	private String input = "";
	private List<String> result;
	
	private Map<String, Entry.Value> position;
	private List<int[]> solutionScores;
	private List<String> solution;
	private List<Entry> nextstack;
	private List<Entry> stack;
	private boolean found;
	private int depth;
	private int cnt;
	private int lvl;

	private final int MAXDEPTH = 50;
	private int MAXSTATS;
	private Stats stats;
	private Logger logger;
	
	public Solver (String input, int gameno, int maxnodes, int blocksolve, boolean winxp, boolean showall) {
		this.input = input;
		this.gameno = gameno;
		this.maxnodes = maxnodes;
		this.blocksolve = blocksolve;
		this.winxp = winxp;
		this.showall = showall;
	}
	
	public String solve () throws Exception {

		while(true){
			position  = new HashMap<String, Entry.Value>();
			solution  = new ArrayList<String>();
			nextstack = new ArrayList<Entry>();
			found     = false;
			depth     = 0;
			result    = new ArrayList<String>();
			
			
			// create gameno tableau
			Tableau tableau = new Tableau();
			if (gameno == 0) {
				blocksolve = 1; // <-- exception --> if blocksolve != 1 && gameno == 0
				tableau.fromString(input); 
			} else {
				tableau.deal(gameno);
			}

			logger = new Logger(gameno);
			logger.log(String.format("--gameno %s --maxnodes %s %s%s%s", gameno, maxnodes,
				winxp ? " --winxp" : " --nowinxp",
				blocksolve > 1 ? " --blocksolve " + blocksolve : "",
				showall ? " --showall" : ""));
		    logger.log("\n" + tableau.toString());
			
			// store initial tableau entry into position hash
			Entry entre = new Entry(tableau);
			entre.value.score = tableau.heuristic();
			MAXSTATS = entre.value.score.length;
			stats = new Stats(MAXSTATS);
			stats.put(entre.value.score);
			position.put(entre.key, entre.value);
			nextstack.add(entre);
			
			while (depth < MAXDEPTH && nextstack.size() > 0 && !found){
				cnt = 0;
				lvl = nextstack.size();

				int[] loscore = stats.findLoScores();	
				int[] hiscore = stats.findHiScores();	
				int[] midscore = stats.findMidScores(maxnodes);	
				stack = new ArrayList<Entry>();
				
				for (Entry entry : nextstack){
					if (entry.value.score[0] > midscore[0]
					&&	entry.value.score[1] > midscore[1]
				//  &&  entry.value.score[2] > midscore[2]
						) continue;
					//TODO needs to use MAXSTATS
					
					// mark all kept entries tree
					stack.add(entry);
					while(true){
						Entry.Value value = position.get(entry.key);
						if (value.level == depth) break;
						value.level = depth;
						if (value.depth == 0) break;
						tableau = new Tableau();
						tableau.fromToken(new Entry(entry.key, value));
						tableau.undo(value.node);
						entry = new Entry(tableau);
					}
				}
				
				// delete all unmarked entries
				int beforesize = position.size();
				Iterator<Map.Entry<String, Entry.Value>> p = position.entrySet().iterator();
				while (p.hasNext()) 
					if (p.next().getValue().level != depth)
						p.remove();
				int aftersize = position.size();
	
				stats = new Stats(MAXSTATS);
				nextstack = new ArrayList<Entry>();
				
				// generate all possible moves for entries in the stack
				for (Entry entry : stack){
					tableau = new Tableau();
					tableau.fromToken(entry);
					search(tableau);
					if (found) break;
				}
				
				logger.log(String.format("d=%2d, l=%8d, s=%3d,%3d,%3d, %3d,%3d,%3d, %3d,%3d,%3d, p=%8d,%8d, cnt=%8d",
					depth, lvl, 
					loscore[0], midscore[0], hiscore[0], 
					loscore[1], midscore[1], hiscore[1],
					loscore[2], midscore[2], hiscore[2], 
					beforesize, aftersize, cnt));
				//TODO needs to use MAXSTATS
				
				if (showall)
					for (TreeMap<Integer, Integer> stat : stats.get())
						logger.log(stat.toString());
					
				depth++;
			}
			if (solution.size() > 0) {

				Collections.reverse(solutionScores);
				StringBuilder sb = new StringBuilder();
				for (int[] ss : solutionScores)
					sb.append(Arrays.toString(ss));
				
			    Collections.reverse(result);

				Collections.reverse(solution);
			    String caption = String.format("%s,%s,%s,%s,", gameno, depth, maxnodes / 1000, 
					winxp ? "xp" : Tableau.winxpwarn ? "w7" : "all");

				logger.log("scores=" + sb.toString() + "\r\n" + 
				           Joiner.on("\r\n").join(result.toArray()) + "\r\n" + 
						   caption +"\r\n"+ Joiner.on("\r\n").join(solution.toArray()));

				if (gameno>0){
					FileWriter upload = null;
					if (blocksolve == 1)
						upload = new FileWriter(              "upload.txt"                   , true);
					else
						upload = new FileWriter(String.format("upload%03d.txt", gameno / 500), true);
					String temp = caption + Joiner.on('~').join(solution.toArray())	+"\r\n";
					upload.write(temp);
					upload.close();
			}   }
			logger.close();
			if (++gameno % blocksolve == 0) break;
	  }
	  return Joiner.on("~").join(result.toArray());
	}

	public void search (Tableau tableau){
		List<ArrayList<Move>> nodelist = tableau.generateNodelist2(winxp);
		for (ArrayList<Move> node : nodelist){
			for (Move move : node)
				tableau.play(move);
			tableau.autoplay(node);
			Entry entry = new Entry(tableau);
			
			// store unique entries in position hash
			if (!position.containsKey(entry.key)){
				entry.value.depth = depth + 1;
				entry.value.node  = node;
				entry.value.score = tableau.heuristic();
				stats.put(entry.value.score);
				position.put(entry.key, entry.value);
				nextstack.add(entry);
			}
			
			// solution found if all kings on homecells
			if ((tableau.tableau[4][0] & 15) == 13
			&&	(tableau.tableau[5][0] & 15) == 13
			&&	(tableau.tableau[6][0] & 15) == 13
			&&	(tableau.tableau[7][0] & 15) == 13){
				backtrack(entry);
				found = true;
			}
			cnt++;
			tableau.undo(node);
			if (found) break;
		}
	}

	public void backtrack (Entry entry){
		solutionScores = new ArrayList<int[]>();
		
		Tableau.winxpwarn = false; // set in Tableau.notation(), used in upload.write
		while (true) {
			if (entry.value.depth == 0)
				break;
			result.add(entry.value.node.toString()); 

			Tableau tableau = new Tableau();
			tableau.fromToken(entry);
			tableau.undo(entry.value.node);
			solution.add(tableau.notation(entry, winxp));
			
			if (showall){
				List<ArrayList<Move>> nodelist = tableau.generateNodelist2(winxp);
				for (ArrayList<Move> node : nodelist){
					for (Move move : node)
						tableau.play(move);
					tableau.autoplay(node);
					tableau.undo(node);
				}
				logger.log("\r\n"+ "gen="+nodelist.toString() +"\r\n"+
					"node="+ entry.value.node +"\r\n"+
					Iterables.getLast(solution) +"\r\n"+ tableau);
			}
			
			entry = new Entry(tableau);
			entry.value = position.get(entry.key);
			solutionScores.add(entry.value.score);
			
			if (showall) {
				logger.log("Entry={key='"+ entry.key 
					+ "', token=" + Arrays.toString(entry.value.token) 
					+ ", depth=" + entry.value.depth
					+ ", scores=" + Arrays.toString(entry.value.score) +",");
			}
		}
	}
}