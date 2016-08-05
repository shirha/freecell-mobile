package org.games.solitaire;
 
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
 
    @Path("/solve")
public class Rest {

    private String result = "";
 
    @GET
    @Path("/{input}")
    @Produces(MediaType.TEXT_PLAIN)
    public String echo(@PathParam("input") String input) {
        if (input.length() == 1 && input.equals("~")) return result;
    	Solver solver = new Solver(input, 0, 2000, 1, 50, false, false);
 		try {
			result = solver.solve();
		} catch (Exception e) {
			e.printStackTrace();
		}
 		return result;
        //return "echo: " + input;
    }
}