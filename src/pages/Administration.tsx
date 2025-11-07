import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Settings, Zap, UserCog, Activity, Database, History, Lock, Users, TrendingUp, AlertCircle, Server, CheckCircle } from "lucide-react";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { RoleManagementTab } from "@/components/admin/RoleManagementTab";
import { PermissionManagementTab } from "@/components/admin/PermissionManagementTab";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { RoleAssignmentManager } from "@/components/settings/RoleAssignmentManager";
import { SystemHealthDashboard } from "@/components/admin/SystemHealthDashboard";
import { BulkOperationsManager } from "@/components/admin/BulkOperationsManager";
import { UserActivityMonitor } from "@/components/admin/UserActivityMonitor";
import { GuestApprovalTab } from "@/components/admin/GuestApprovalTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Administration() {
  const [activeTab, setActiveTab] = useState("overview");

  const stats = [
    { label: "Total Users", value: "248", icon: Users, change: "+12%", trend: "up" },
    { label: "Active Sessions", value: "64", icon: Activity, change: "+8%", trend: "up" },
    { label: "System Health", value: "99.9%", icon: Server, change: "Optimal", trend: "neutral" },
    { label: "Pending Actions", value: "5", icon: AlertCircle, change: "-3", trend: "down" },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 animate-fade-in">
        {/* Executive Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 p-8 border border-red-500/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <Shield className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium">System Control</span>
            </div>
            <h1 className="text-5xl font-black font-['Space_Grotesk'] mb-3">Administration</h1>
            <p className="text-muted-foreground text-lg">
              Manage users, roles, permissions, and system settings
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-0.5 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-sm">{stat.label}</CardDescription>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <CardTitle className="text-4xl font-bold">{stat.value}</CardTitle>
                  <Badge variant={stat.trend === "up" ? "default" : stat.trend === "down" ? "secondary" : "outline"} className="text-xs">
                    {stat.change}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full h-auto p-1 gap-1">
              <TabsTrigger value="overview" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Database className="h-4 w-4" />
                System Health
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Shield className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Settings className="h-4 w-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <Lock className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-2">
                <UserCog className="h-4 w-4" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="bulk-ops" className="gap-2">
                <Zap className="h-4 w-4" />
                Bulk Operations
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <History className="h-4 w-4" />
                Activity Monitor
              </TabsTrigger>
              <TabsTrigger value="guests" className="gap-2">
                <UserCog className="h-4 w-4" />
                Guest Approvals
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-2">
                <Activity className="h-4 w-4" />
                Automation
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors" onClick={() => setActiveTab("users")}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Manage Users</span>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors" onClick={() => setActiveTab("roles")}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Configure Roles</span>
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors" onClick={() => setActiveTab("health")}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">System Health</span>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest system events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="font-medium">New user registered</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="font-medium">Role permissions updated</p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-orange-500 mt-1.5" />
                    <div className="flex-1">
                      <p className="font-medium">System backup completed</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleManagementTab />
          </TabsContent>

          <TabsContent value="permissions" className="mt-6">
            <PermissionManagementTab />
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
