import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings, Mail, Zap, UserCog } from "lucide-react";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { RoleManagementTab } from "@/components/admin/RoleManagementTab";
import { SMTPSettings } from "@/components/settings/SMTPSettings";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { RoleAssignmentManager } from "@/components/settings/RoleAssignmentManager";

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
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Zap className="h-4 w-4 mr-2" />
              Automation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleManagementTab />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <RoleAssignmentManager />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <SMTPSettings />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <AutomationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
