import { NotificationsSkeleton } from "@/components/skeletons/NotificationsSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { Bell, Settings, Filter, Search, CheckCheck, Trash2, Mail, MessageSquare, Calendar, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const Notifications = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  const stats = [
    { label: "Unread", value: "12", icon: Mail, color: "text-blue-500" },
    { label: "Today", value: "8", icon: Calendar, color: "text-green-500" },
    { label: "Important", value: "3", icon: AlertCircle, color: "text-orange-500" },
    { label: "Total", value: "47", icon: Info, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Executive Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 p-8 border border-indigo-500/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <Bell className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium">Communication Center</span>
            </div>
            <h1 className="text-5xl font-black font-['Space_Grotesk'] mb-3">Notifications</h1>
            <p className="text-muted-foreground text-lg">
              Stay updated with real-time alerts and communication preferences
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all hover:shadow-md hover:-translate-y-0.5 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-sm">{stat.label}</CardDescription>
                  <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <CardTitle className="text-4xl font-bold">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
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
            
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" className="gap-2">
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>

          <TabsContent value="inbox" className="space-y-4 mt-0">
            <Card className="p-4 border-2">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === "meetings" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("meetings")}
                    className="gap-2"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Meetings
                  </Button>
                  <Button
                    variant={filterType === "messages" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("messages")}
                    className="gap-2"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Messages
                  </Button>
                  <Button
                    variant={filterType === "alerts" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("alerts")}
                    className="gap-2"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    Alerts
                  </Button>
                </div>
              </div>
            </Card>
            
            <NotificationCenter />
          </TabsContent>

          <TabsContent value="preferences" className="mt-0">
            <div className="max-w-2xl">
              <NotificationPreferencesForm />
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default Notifications;
