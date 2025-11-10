import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Search, Star, TrendingUp, Users, FileText, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateSection {
  id: string;
  name: string;
  required: boolean;
  order: number;
}

interface MarketplaceTemplate {
  id: string;
  name: string;
  meeting_type: string;
  description: string | null;
  sections: any;
  is_public: boolean;
  shared_by: string | null;
  shared_at: string | null;
  download_count: number;
  category: string;
  created_at: string;
  is_default: boolean;
  created_by: string;
}

const CATEGORIES = [
  'All',
  'Board Meeting',
  'Team Meeting',
  'Executive Meeting',
  'Strategic Planning',
  'Operations Review',
  'Project Review',
  'One-on-One',
];

export const TemplateMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'downloads'>('popular');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: publicTemplates, isLoading } = useQuery({
    queryKey: ['marketplace-templates', selectedCategory, sortBy],
    queryFn: async () => {
      let query: any = supabase.from('meeting_templates').select('*').eq('is_public', true);

      // Apply category filter
      if (selectedCategory !== 'All') {
        query = query.eq('meeting_type', selectedCategory);
      }

      // Apply sorting
      const orderColumn = sortBy === 'recent' ? 'shared_at' : 'download_count';
      query = query.order(orderColumn, { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a copy of the template for the user
      const { data, error } = await supabase
        .from('meeting_templates')
        .insert({
          name: template.name,
          meeting_type: template.meeting_type,
          description: template.description,
          sections: template.sections,
          is_default: false,
          is_public: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment download count
      await supabase
        .from('meeting_templates')
        .update({ download_count: (template.download_count || 0) + 1 })
        .eq('id', template.id);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-templates'] });
      toast({
        title: 'Template downloaded',
        description: 'Template has been added to your templates.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredTemplates = publicTemplates?.filter((template: any) =>
    template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: publicTemplates?.length || 0,
    downloads: publicTemplates?.reduce((sum: number, t: any) => sum + (t.download_count || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Template Marketplace</h2>
        <p className="text-muted-foreground">
          Browse and download pre-built meeting templates from the community
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Download className="h-4 w-4" />
              Total Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.downloads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {new Set(publicTemplates?.map((t: any) => t.shared_by)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Popular
              </div>
            </SelectItem>
            <SelectItem value="recent">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recently Added
              </div>
            </SelectItem>
            <SelectItem value="downloads">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Most Downloaded
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template: any) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow group">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{template.meeting_type}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Download className="h-3 w-3" />
                    {template.download_count || 0}
                  </div>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description || 'No description provided'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{Array.isArray(template.sections) ? template.sections.length : 0} sections</span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Template
                  </span>
                </div>

                <Button
                  onClick={() => downloadTemplateMutation.mutate(template)}
                  disabled={downloadTemplateMutation.isPending}
                  className="w-full gap-2 group-hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  {downloadTemplateMutation.isPending ? 'Downloading...' : 'Download Template'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No templates found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to share a template with the community'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
