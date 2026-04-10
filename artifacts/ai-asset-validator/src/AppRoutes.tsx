import { Switch, Route, useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/projects/[id]";
import ValidationDetail from "@/pages/validation-detail";
import RunPage from "@/pages/run";
import Observability from "@/pages/observability";
import Prompts from "@/pages/prompts";
import Users from "@/pages/users";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/auth-route";

export default function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      <Route path="/">
        <ProtectedRoute component={() => null} redirectToProjects />
      </Route>
      
      <Route path="/projects">
        <AppLayout><ProtectedRoute component={Projects} /></AppLayout>
      </Route>

      <Route path="/projects/:projectId/validations/:validationId">
        <AppLayout><ProtectedRoute component={ValidationDetail} /></AppLayout>
      </Route>
      
      <Route path="/projects/:id">
        <AppLayout><ProtectedRoute component={ProjectDetail} /></AppLayout>
      </Route>

      <Route path="/run">
        <AppLayout><ProtectedRoute component={RunPage} /></AppLayout>
      </Route>
      
      <Route path="/observability">
        <AppLayout><ProtectedRoute component={Observability} /></AppLayout>
      </Route>
      
      <Route path="/prompts">
        <AppLayout><ProtectedRoute component={Prompts} adminOnly /></AppLayout>
      </Route>
      
      <Route path="/users">
        <AppLayout><ProtectedRoute component={Users} adminOnly /></AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}