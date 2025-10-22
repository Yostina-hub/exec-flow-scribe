import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequirePermission } from "@/components/RequirePermission";
import { useSystemIntegration } from "@/hooks/useSystemIntegration";
import { useCalendarActionSync } from "@/hooks/useCalendarActionSync";
import { useNotificationDispatcher } from "@/hooks/useNotificationDispatcher";
import Index from "./pages/Index";
import CalendarView from "./pages/CalendarView";
import Meetings from "./pages/Meetings";
import DriveIntegration from "./pages/DriveIntegration";
import Actions from "./pages/Actions";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import MeetingDetail from "./pages/MeetingDetail";
import MinutesEditor from "./pages/MinutesEditor";
import SignatureApproval from "./pages/SignatureApproval";
import QuickParticipant from "./pages/QuickParticipant";
import Settings from "./pages/Settings";
import Administration from "./pages/Administration";
import IntegrationTest from "./pages/IntegrationTest";
import Notebook from "./pages/Notebook";
import NotebooksLibrary from "./pages/NotebooksLibrary";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback";
import DocumentViewer from "./components/DocumentViewer";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const IntegrationProvider = ({ children }: { children: React.ReactNode }) => {
  useSystemIntegration();
  useCalendarActionSync();
  useNotificationDispatcher();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
        <IntegrationProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/google-oauth-callback" 
              element={
                <ProtectedRoute>
                  <GoogleOAuthCallback />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings"
              element={
                <ProtectedRoute>
                  <Meetings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings/:id"
              element={
                <ProtectedRoute>
                  <MeetingDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings/:meetingId/minutes"
              element={
                <ProtectedRoute>
                  <MinutesEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drive"
              element={
                <ProtectedRoute>
                  <DriveIntegration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebooks"
              element={
                <ProtectedRoute>
                  <NotebooksLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook"
              element={
                <ProtectedRoute>
                  <Notebook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/signature/:requestId"
              element={
                <ProtectedRoute>
                  <SignatureApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/actions"
              element={
                <ProtectedRoute>
                  <Actions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RequirePermission resource="users" action="manage">
                    <Administration />
                  </RequirePermission>
                </ProtectedRoute>
              }
            />
            <Route
              path="/integration-test"
              element={
                <ProtectedRoute>
                  <IntegrationTest />
                </ProtectedRoute>
              }
            />
            <Route path="/document" element={<DocumentViewer />} />
            <Route path="/quick-join/:meetingId" element={<QuickParticipant />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </IntegrationProvider>
        <Toaster />
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;
