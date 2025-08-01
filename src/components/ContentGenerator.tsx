import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Search, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreditCard {
  id: string;
  card_name: string;
  bank_name: string;
  slug: string;
  description?: string;
  rewards_summary?: string;
}

interface GeneratedContent {
  id: string;
  content_variation: string;
}

export const ContentGenerator = () => {
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CreditCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [platform, setPlatform] = useState("");
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState("");
  const [tone, setTone] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const { toast } = useToast();

  const searchCards = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch("https://bk-api.bankkaro.com/sp/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "",
          banks_ids: [],
          card_networks: [],
          annualFees: "",
          credit_score: "",
          sort_by: "",
          free_cards: "",
          eligiblityPayload: {},
          cardGeniusPayload: {}
        })
      });
      
      const data = await response.json();
      const filteredCards = data.data?.filter((card: any) => 
        card.card_name?.toLowerCase().includes(query.toLowerCase()) ||
        card.issuing_bank?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5) || [];
      
      setSearchResults(filteredCards.map((card: any) => ({
        id: card.id,
        card_name: card.card_name,
        bank_name: card.issuing_bank,
        slug: card.slug,
        description: card.description,
        rewards_summary: card.rewards_summary
      })));
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Couldn't search cards. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const generateContent = async () => {
    if (!selectedCard || !platform || !audience || !language || !tone) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Store user input
      const { data: inputData, error: inputError } = await supabase
        .from("user_inputs")
        .insert({
          card_id: selectedCard.id,
          platform,
          audience,
          language,
          tone,
          custom_prompt: customPrompt || null
        })
        .select()
        .single();

      if (inputError) throw inputError;

      // Generate content using Gemini API (this would be handled by a Supabase Edge Function)
      const prompt = `Create 4 variations of content to promote the "${selectedCard.card_name}" credit card.
Platform: ${platform}
Audience: ${audience}
Language: ${language}
Tone: ${tone}

${customPrompt ? `Additional instruction: ${customPrompt}` : ''}

The content should be platform-appropriate, concise, and persuasive.`;

      // For now, creating mock content - you'll need to implement the Gemini API call in a Supabase Edge Function
      const mockContent = [
        `🎯 Exclusive ${selectedCard.card_name} offer! Perfect for ${audience.toLowerCase()}. ${tone === 'exciting' ? '🚀' : ''}`,
        `Looking for a great credit card? The ${selectedCard.card_name} from ${selectedCard.bank_name} is exactly what you need!`,
        `${tone === 'friendly' ? 'Hey there!' : 'Attention:'} Just discovered the amazing benefits of ${selectedCard.card_name}. Worth checking out!`,
        `${selectedCard.card_name} review: This card offers incredible value. Here's why it's perfect for your needs...`
      ];

      // Store generated content
      const contentPromises = mockContent.map(async (content, index) => {
        const { data, error } = await supabase
          .from("ai_outputs")
          .insert({
            input_id: inputData.id,
            variation_number: index + 1,
            content_variation: content
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      });

      const results = await Promise.all(contentPromises);
      setGeneratedContent(results);

    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Couldn't generate content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Couldn't copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-semibold text-foreground">Content Generator</h1>
          <p className="text-xl text-muted-foreground">Create engaging content for your credit card promotions</p>
        </div>

        {/* Card Search */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Label htmlFor="card-search" className="text-sm font-medium">Search Credit Card</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="card-search"
                  placeholder="Search credit card..."
                  value={cardSearch}
                  onChange={(e) => {
                    setCardSearch(e.target.value);
                    searchCards(e.target.value);
                  }}
                  className="pl-10"
                />
                {isSearching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 border rounded-lg p-2">
                  {searchResults.map((card) => (
                    <div
                      key={card.id}
                      className="p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCard(card);
                        setCardSearch(`${card.card_name} - ${card.bank_name}`);
                        setSearchResults([]);
                      }}
                    >
                      <div className="font-medium">{card.card_name}</div>
                      <div className="text-sm text-muted-foreground">{card.bank_name}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedCard && (
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="font-medium text-accent-foreground">Selected: {selectedCard.card_name}</div>
                  <div className="text-sm text-muted-foreground">Bank: {selectedCard.bank_name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Questions */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="followers">Followers</SelectItem>
                    <SelectItem value="colleagues">Colleagues</SelectItem>
                    <SelectItem value="peers">Peers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="funny">Funny</SelectItem>
                    <SelectItem value="exciting">Exciting</SelectItem>
                    <SelectItem value="quirky">Quirky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
              <Textarea
                id="custom-prompt"
                placeholder="E.g., This card is great for travel bloggers – highlight lounge access."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[100px]"
                maxLength={300}
              />
              <div className="text-sm text-muted-foreground">{customPrompt.length}/300</div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={generateContent}
                disabled={!selectedCard || !platform || !audience || !language || !tone || isGenerating}
                className="flex-1"
              >
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Now
              </Button>
              
              {generatedContent.length > 0 && (
                <Button variant="outline" onClick={generateContent} disabled={isGenerating}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generated Content */}
        {generatedContent.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Generated Content</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedContent.map((content, index) => (
                <Card key={content.id} className="relative">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Option {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(content.content_variation)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed">{content.content_variation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};