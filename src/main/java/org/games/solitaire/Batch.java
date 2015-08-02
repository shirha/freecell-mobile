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

import java.io.File;
import java.util.Scanner;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;

public class Batch {

	@Parameter(names = "--gameno", description = "Microsoft Freecell gameno", required = true)
	private int gameno;

	@Parameter(names = "--maxnodes", description = "maxnodes per level retained")
	private int maxnodes = 2000;

	@Parameter(names = "--blocksolve", description = "Generate blocksize solutions")
	private int blocksolve = 1;
	
	@Parameter(names = "--winxp", description = "Solve for Windows XP")
	private boolean winxp = false;
	
	@Parameter(names = "--showall", description = "Debug mode")
	private boolean showall = false;
	
	private String input = "";
	
	public static void main(String[] args) {
		Batch batch = new Batch();
		new JCommander(batch, args);
		try {
			batch.run();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void run() throws Exception {
		if (gameno < 0) {
 			System.out.println("Please use options:\n\n" +
				"  java [ -d64 -Xmx6g ] -jar fcsolver.jar " +
				"--gameno <1-1000000000> [ --maxnodes <2000-200000> ] "+
				"[ --winxp ] [ --blocksolve <1000-33000> ] [ --showall ]\n\n" +
				"       -d64 is 64bit;\n" +
				"       -Xmx6g is 6G heapsize;\n");
			System.exit(1);
		}

		if (gameno == 0) {
			input = new Scanner(new File("input.txt"), "UTF-8").useDelimiter("\\A").next();
		}
		
    	Solver solver = new Solver(input, gameno, maxnodes, blocksolve, winxp, showall);
 		try {
			solver.solve();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}