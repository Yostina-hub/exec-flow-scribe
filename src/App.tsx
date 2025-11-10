import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequirePermission } from "@/components/RequirePermission";
import { Layout } from "@/components/Layout";
import { useSystemIntegration } from "@/hooks/useSystemIntegration";
import { useCalendarActionSync } from "@/hooks/useCalendarActionSync";
import { useNotificationDispatcher } from "@/hooks/useNotificationDispatcher";
import { useGubaAutoGeneration } from "@/hooks/useGubaAutoGeneration";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
import QuickJoinMeeting from "./pages/QuickJoinMeeting";
import Settings from "./pages/Settings";
import Administration from "./pages/Administration";
import IntegrationTest from "./pages/IntegrationTest";
import Notebook from "./pages/Notebook";
import NotebooksLibrary from "./pages/NotebooksLibrary";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback";
import ExecutiveAdvisor from "./pages/ExecutiveAdvisor";
import ExecutiveInbox from "./pages/ExecutiveInbox";
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
  useGubaAutoGeneration();
  return <>{children}</>;
};

// Protected layout wrapper that persists across routes
const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <IntegrationProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/document" element={<DocumentViewer />} />
            <Route path="/quick-join" element={<QuickJoinMeeting />} />
            <Route path="/quick-join/:meetingId" element={<QuickParticipant />} />
            
            {/* Protected routes with persistent Layout */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/executive-advisor" element={<ExecutiveAdvisor />} />
              <Route path="/executive-inbox" element={<ExecutiveInbox />} />
              <Route path="/advisor" element={<ExecutiveAdvisor />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/meetings/:id" element={<MeetingDetail />} />
              <Route path="/meeting/:id" element={<MeetingDetail />} />
              <Route path="/meetings/:meetingId/minutes" element={<MinutesEditor />} />
              <Route path="/drive" element={<DriveIntegration />} />
              <Route path="/notebooks-library" element={<NotebooksLibrary />} />
              <Route path="/notebooks" element={<NotebooksLibrary />} />
              <Route path="/notebook" element={<Notebook />} />
              <Route path="/signature/:requestId" element={<SignatureApproval />} />
              <Route path="/signature-approval/:requestId" element={<SignatureApproval />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
              
              {/* Permission-protected routes */}
              <Route path="/actions" element={<RequirePermission resource="users" action="manage"><Actions /></RequirePermission>} />
              <Route path="/notifications" element={<RequirePermission resource="users" action="manage"><Notifications /></RequirePermission>} />
              <Route path="/admin" element={<RequirePermission resource="users" action="manage"><Administration /></RequirePermission>} />
              <Route path="/integration-test" element={<RequirePermission resource="users" action="manage"><IntegrationTest /></RequirePermission>} />
            </Route>
            
            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </IntegrationProvider>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
