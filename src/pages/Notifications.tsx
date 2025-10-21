import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { Bell, Settings } from "lucide-react";

const Notifications = () => {
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and communication preferences
          </p>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="inbox" className="gap-2">
              <Bell className="h-4 w-4" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-6">
            <NotificationCenter />
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <div className="max-w-2xl">
              <NotificationPreferencesForm />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Notifications;
