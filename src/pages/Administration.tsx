import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings, Zap, UserCog, Activity, Database, History } from "lucide-react";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { RoleManagementTab } from "@/components/admin/RoleManagementTab";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { RoleAssignmentManager } from "@/components/settings/RoleAssignmentManager";
import { SystemHealthDashboard } from "@/components/admin/SystemHealthDashboard";
import { BulkOperationsManager } from "@/components/admin/BulkOperationsManager";
import { UserActivityMonitor } from "@/components/admin/UserActivityMonitor";
import { GuestApprovalTab } from "@/components/admin/GuestApprovalTab";

export default function Administration() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Administration
            </h1>
            <p className="text-muted-foreground">
              Manage users, roles, and permissions
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full h-auto p-1 gap-1">
              <TabsTrigger value="health">
                <Database className="h-4 w-4 mr-2" />
                System Health
              </TabsTrigger>
              <TabsTrigger value="users">
                <Shield className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Settings className="h-4 w-4 mr-2" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="assignments">
                <UserCog className="h-4 w-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="bulk-ops">
                <Zap className="h-4 w-4 mr-2" />
                Bulk Operations
              </TabsTrigger>
              <TabsTrigger value="activity">
                <History className="h-4 w-4 mr-2" />
                Activity Monitor
              </TabsTrigger>
              <TabsTrigger value="guests">
                <UserCog className="h-4 w-4 mr-2" />
                Guest Approvals
              </TabsTrigger>
              <TabsTrigger value="automation">
                <Activity className="h-4 w-4 mr-2" />
                Automation
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="health" className="mt-6">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleManagementTab />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <RoleAssignmentManager />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <AutomationSettings />
          </TabsContent>

          <TabsContent value="bulk-ops" className="mt-6">
            <BulkOperationsManager />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <UserActivityMonitor />
          </TabsContent>

          <TabsContent value="guests" className="mt-6">
            <GuestApprovalTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
