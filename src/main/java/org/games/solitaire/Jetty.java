package org.games.solitaire;
 
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;

public class Jetty {
    public static void main(String[] args) throws Exception {

        System.setProperty("org.eclipse.jetty.LEVEL","INFO");

        Server server = new Server();
        ServerConnector connector = new ServerConnector(server);
        connector.setPort(8080);
        server.addConnector(connector);

        // Setup the basic appliation "context" for this application at "/"
        // This is also known as the handler tree (in jetty speak)
        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        server.setHandler(context);

        // The filesystem paths we will map
        String homePath = System.getProperty("user.home");
        String pwdPath = System.getProperty("user.dir");

        // add a simple Servlet at "dynamic/*"
        ServletHolder holderDynamic = new ServletHolder(
            "dynamic", org.glassfish.jersey.servlet.ServletContainer.class);
        context.addServlet(holderDynamic, "/dynamic/*");

        holderDynamic.setInitOrder(0);
 
        // Tells the Jersey Servlet which REST service/class to load.
        holderDynamic.setInitParameter(
           "jersey.config.server.provider.classnames",
           Rest.class.getCanonicalName());

        // add special pathspec of "/home/" content mapped to the homePath
        ServletHolder holderHome = new ServletHolder(
            "static-home", DefaultServlet.class);
        holderHome.setInitParameter("resourceBase",homePath);
        holderHome.setInitParameter("dirAllowed","true");
        holderHome.setInitParameter("pathInfoOnly","true");
        context.addServlet(holderHome,"/home/*");

        // Lastly, the default servlet for root content (always needed, to satisfy servlet spec)
        // It is important that this is last.
        ServletHolder holderPwd = new ServletHolder(
            "default", DefaultServlet.class);
        holderPwd.setInitParameter("resourceBase",pwdPath);
        holderPwd.setInitParameter("dirAllowed","true");
        context.addServlet(holderPwd,"/");

        try
        {
            server.start();
            server.dump(System.err);
            server.join();
        }
        catch (Throwable t)
        {
            t.printStackTrace(System.err);
        }
    }
}
