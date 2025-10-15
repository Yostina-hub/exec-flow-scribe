import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Download, 
  FileText, 
  Calendar as CalendarIcon, 
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const reportTypes = [
  {
    id: "meeting-summary",
    title: "Meeting Summary Report",
    description: "Comprehensive overview of all meetings with attendance and outcomes",
    icon: FileText,
    metrics: [
      { label: "Total Meetings", value: "118" },
      { label: "Total Hours", value: "177" },
      { label: "Avg. Duration", value: "90 min" },
    ],
  },
  {
    id: "action-items",
    title: "Action Items Report",
    description: "Status tracking and completion metrics for all action items",
    icon: CheckCircle2,
    metrics: [
      { label: "Total Actions", value: "124" },
      { label: "Completed", value: "108" },
      { label: "Completion Rate", value: "87%" },
    ],
  },
  {
    id: "attendance",
    title: "Attendance Report",
    description: "Executive participation rates and meeting engagement metrics",
    icon: Users,
    metrics: [
      { label: "Avg. Attendance", value: "7.5" },
      { label: "Attendance Rate", value: "94%" },
      { label: "Most Active", value: "CEO" },
    ],
  },
  {
    id: "productivity",
    title: "Productivity Report",
    description: "Time allocation, meeting efficiency, and productivity insights",
    icon: TrendingUp,
    metrics: [
      { label: "Meeting Hours", value: "177" },
      { label: "Avg. Per Week", value: "12.5 hrs" },
      { label: "Efficiency Score", value: "85%" },
    ],
  },
];

const exportFormats = [
  { value: "pdf", label: "PDF Document" },
  { value: "xlsx", label: "Excel Spreadsheet" },
  { value: "csv", label: "CSV File" },
  { value: "json", label: "JSON Data" },
];

const Reports = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const { toast } = useToast();

  const handleExport = (reportType: string) => {
    toast({
      title: "Generating Report",
      description: `Your ${reportType} report is being prepared for download`,
    });
    
    // Simulate export delay
    setTimeout(() => {
      toast({
        title: "Report Ready",
        description: `Your report has been generated successfully`,
      });
    }, 2000);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and export comprehensive meeting reports
          </p>
        </div>

        {/* Export Configuration */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Report Configuration
            </CardTitle>
            <CardDescription>
              Set date range and export format for your reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                This Quarter
              </Button>
              <Button variant="outline" className="flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                This Year
              </Button>
              <Button variant="outline" className="flex-1">
                <CalendarIcon className="mr-2 h-4 w-4" />
                All Time
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Types */}
        <Tabs defaultValue="quick" className="w-full">
          <TabsList>
            <TabsTrigger value="quick">Quick Reports</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {reportTypes.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <report.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {report.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {report.metrics.map((metric, index) => (
                        <div key={index}>
                          <p className="text-2xl font-bold">{metric.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {metric.label}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleExport(report.title)}
                    >
                      <Download className="h-4 w-4" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>
                  Create a personalized report with selected metrics and filters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Q4 Executive Summary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Include Metrics</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Meeting Count", "Total Hours", "Attendance Rate", "Action Items", "Completion Rate", "Efficiency Score"].map((metric) => (
                        <label key={metric} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked />
                          <span className="text-sm">{metric}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter By</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Meetings</SelectItem>
                        <SelectItem value="strategy">Strategy Meetings</SelectItem>
                        <SelectItem value="operations">Operations Meetings</SelectItem>
                        <SelectItem value="planning">Planning Sessions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Save Template</Button>
                  <Button className="flex-1 gap-2" onClick={() => handleExport("Custom")}>
                    <Download className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
                <CardDescription>
                  Automatically generate and email reports on a schedule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No scheduled reports configured yet
                  </p>
                  <Button>Create Scheduled Report</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
