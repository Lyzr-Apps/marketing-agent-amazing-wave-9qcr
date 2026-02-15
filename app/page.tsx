'use client'

import { useState, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  HiOutlineHome,
  HiOutlinePencilSquare,
  HiOutlineMagnifyingGlass,
  HiOutlinePhoto,
  HiOutlineClipboardDocument,
  HiOutlineArrowPath,
  HiOutlineXMark,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineArrowDownTray,
  HiOutlineBolt,
  HiOutlineTag,
  HiOutlineInformationCircle,
} from 'react-icons/hi2'

// --- Agent IDs ---
const CONTENT_WRITER_AGENT_ID = '699207063361b44adf2951f0'
const SEO_ANALYSIS_AGENT_ID = '6992070761e2cce880e01709'
const GRAPHIC_GENERATION_AGENT_ID = '6992070772b5bcf5c3207f93'

// --- Types ---
interface ContentWriterResponse {
  title?: string
  content?: string
  content_type?: string
  tone?: string
  word_count?: number
  estimated_read_time?: string
  keywords_used?: string[]
}

interface KeywordItem {
  keyword?: string
  density?: string
}

interface OptimizationTip {
  tip?: string
  priority?: string
}

interface SEOResponse {
  overall_score?: number
  readability_score?: number
  readability_grade?: string
  keyword_analysis?: {
    primary_keywords?: KeywordItem[]
    secondary_keywords?: KeywordItem[]
  }
  meta_suggestions?: {
    title?: string
    description?: string
  }
  heading_recommendations?: string[]
  optimization_tips?: OptimizationTip[]
  content_length_assessment?: string
  competitive_insights?: string[]
}

interface GraphicResponse {
  image_description?: string
  style?: string
  aspect_ratio?: string
}

interface RecentOutput {
  id: string
  type: 'content' | 'seo' | 'graphic'
  title: string
  timestamp: string
}

interface GeneratedImage {
  url: string
  description: string
  style: string
  timestamp: string
}

type ScreenType = 'dashboard' | 'content' | 'seo' | 'graphics'

// --- Sample Data ---
const SAMPLE_CONTENT_RESPONSE: ContentWriterResponse = {
  title: 'The Future of AI in Digital Marketing: 5 Trends to Watch',
  content: '## Introduction\n\nArtificial intelligence is rapidly transforming the digital marketing landscape. From personalized content recommendations to automated ad optimization, **AI-powered tools** are helping marketers achieve unprecedented results.\n\n## 1. Hyper-Personalization at Scale\n\nAI enables marketers to deliver **tailored experiences** to millions of users simultaneously. Machine learning algorithms analyze user behavior patterns to predict preferences and serve relevant content.\n\n## 2. Predictive Analytics\n\nWith AI-driven predictive models, marketers can:\n- Forecast customer lifetime value\n- Identify churn risk early\n- Optimize budget allocation\n- Predict campaign performance\n\n## 3. Conversational Marketing\n\nAI chatbots and virtual assistants are becoming more sophisticated, enabling **natural conversations** that guide prospects through the sales funnel.\n\n## 4. Visual Content Generation\n\nGenerative AI tools can create compelling visuals, ad creatives, and even video content, significantly reducing production time and costs.\n\n## 5. Voice Search Optimization\n\nAs voice assistants gain popularity, optimizing content for **voice search queries** has become essential for maintaining visibility.\n\n## Conclusion\n\nThe integration of AI in marketing is not a future possibility -- it\'s a present reality. Businesses that embrace these technologies will gain a significant competitive advantage.',
  content_type: 'Blog Post',
  tone: 'Professional',
  word_count: 187,
  estimated_read_time: '2 min read',
  keywords_used: ['AI', 'digital marketing', 'personalization', 'predictive analytics', 'content generation'],
}

const SAMPLE_SEO_RESPONSE: SEOResponse = {
  overall_score: 78,
  readability_score: 82,
  readability_grade: 'Grade 8 - Easy to Read',
  keyword_analysis: {
    primary_keywords: [
      { keyword: 'AI marketing', density: '2.8%' },
      { keyword: 'digital marketing', density: '2.1%' },
    ],
    secondary_keywords: [
      { keyword: 'personalization', density: '1.4%' },
      { keyword: 'predictive analytics', density: '1.1%' },
      { keyword: 'content generation', density: '0.9%' },
    ],
  },
  meta_suggestions: {
    title: 'AI in Digital Marketing: 5 Key Trends for 2025 | Marketing Hub',
    description: 'Discover the top 5 AI trends transforming digital marketing in 2025. Learn about hyper-personalization, predictive analytics, and more.',
  },
  heading_recommendations: [
    'Add H2 headings for each major section',
    'Include primary keyword in at least one H2',
    'Keep heading hierarchy consistent (H1 > H2 > H3)',
    'Consider adding FAQ section with H3 headings',
  ],
  optimization_tips: [
    { tip: 'Add internal links to related content', priority: 'high' },
    { tip: 'Include alt text for all images', priority: 'high' },
    { tip: 'Increase content length to 1500+ words', priority: 'medium' },
    { tip: 'Add schema markup for better SERP display', priority: 'medium' },
    { tip: 'Optimize page load speed', priority: 'low' },
  ],
  content_length_assessment: 'Content is below the recommended length of 1,500 words for competitive topics. Consider expanding key sections with more detailed examples and data.',
  competitive_insights: [
    'Top-ranking articles average 2,200 words on this topic',
    'Competitors frequently use infographics and data visualizations',
    'Featured snippets are available for list-based queries',
    'Video content on this topic has high engagement rates',
  ],
}

const SAMPLE_RECENT_OUTPUTS: RecentOutput[] = [
  { id: '1', type: 'content', title: 'AI in Digital Marketing Blog Post', timestamp: '2 hours ago' },
  { id: '2', type: 'seo', title: 'SEO Analysis: Landing Page', timestamp: '4 hours ago' },
  { id: '3', type: 'graphic', title: 'Social Media Banner', timestamp: '6 hours ago' },
  { id: '4', type: 'content', title: 'Product Launch Email', timestamp: '1 day ago' },
]

// --- Helpers ---
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-foreground">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1 text-foreground">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-foreground">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm text-foreground/80">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm text-foreground/80">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-foreground/80 leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function SEOScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 70 ? 'hsl(142, 76%, 36%)' : score >= 40 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)'
  const bgColor = score >= 70 ? 'hsl(142, 76%, 90%)' : score >= 40 ? 'hsl(45, 93%, 90%)' : 'hsl(0, 84%, 90%)'

  return (
    <div className="relative flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority ?? '').toLowerCase()
  if (p === 'high') return <Badge variant="destructive" className="text-xs">High</Badge>
  if (p === 'medium') return <Badge className="text-xs bg-yellow-500/20 text-yellow-700 border-yellow-300 hover:bg-yellow-500/30">Medium</Badge>
  return <Badge variant="secondary" className="text-xs">Low</Badge>
}

function TypeBadge({ type }: { type: 'content' | 'seo' | 'graphic' }) {
  if (type === 'content') return <Badge className="text-xs bg-blue-500/15 text-blue-700 border-blue-200 hover:bg-blue-500/20">Content</Badge>
  if (type === 'seo') return <Badge className="text-xs bg-green-500/15 text-green-700 border-green-200 hover:bg-green-500/20">SEO</Badge>
  return <Badge className="text-xs bg-purple-500/15 text-purple-700 border-purple-200 hover:bg-purple-500/20">Graphic</Badge>
}

// --- Sidebar ---
function AppSidebar({
  activeScreen,
  onNavigate,
}: {
  activeScreen: ScreenType
  onNavigate: (screen: ScreenType) => void
}) {
  const navItems: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <HiOutlineHome className="w-5 h-5" /> },
    { id: 'content', label: 'Content Writer', icon: <HiOutlinePencilSquare className="w-5 h-5" /> },
    { id: 'seo', label: 'SEO Analyzer', icon: <HiOutlineChartBar className="w-5 h-5" /> },
    { id: 'graphics', label: 'Graphics Studio', icon: <HiOutlinePhoto className="w-5 h-5" /> },
  ]

  return (
    <div className="w-64 h-screen flex-shrink-0 flex flex-col border-r border-border bg-[hsl(30,38%,95%)]">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <HiOutlineSparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-base text-foreground font-sans">Marketing AI Hub</h1>
            <p className="text-[11px] text-muted-foreground">Powered by AI Agents</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              activeScreen === item.id
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-foreground/70 hover:bg-[hsl(30,35%,90%)] hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="p-3 rounded-xl bg-[hsl(30,35%,90%)]">
          <p className="text-xs font-medium text-foreground mb-2">Agent Status</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="truncate">Content Writer</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="truncate">SEO Analyzer</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="truncate">Graphics Studio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Dashboard Screen ---
function DashboardScreen({
  onNavigate,
  recentOutputs,
  showSampleData,
}: {
  onNavigate: (screen: ScreenType) => void
  recentOutputs: RecentOutput[]
  showSampleData: boolean
}) {
  const cards = [
    {
      id: 'content' as ScreenType,
      title: 'Content Writer',
      description: 'Generate blog posts, ad copy, and marketing content',
      icon: <HiOutlinePencilSquare className="w-7 h-7" />,
      iconBg: 'bg-orange-500/15',
      iconColor: 'text-orange-600',
    },
    {
      id: 'seo' as ScreenType,
      title: 'SEO Analyzer',
      description: 'Analyze and optimize content for search engines',
      icon: <HiOutlineChartBar className="w-7 h-7" />,
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
    },
    {
      id: 'graphics' as ScreenType,
      title: 'Graphics Studio',
      description: 'Create AI-powered marketing visuals',
      icon: <HiOutlinePhoto className="w-7 h-7" />,
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-600',
    },
  ]

  const displayOutputs = showSampleData && recentOutputs.length === 0 ? SAMPLE_RECENT_OUTPUTS : recentOutputs

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-1">Welcome to Marketing AI Hub</h2>
        <p className="text-muted-foreground text-sm">Select a workspace to get started with AI-powered marketing tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {cards.map((card) => (
          <Card
            key={card.id}
            className={cn(
              'cursor-pointer group border border-border/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
              'backdrop-blur-[16px] bg-card/75'
            )}
            onClick={() => onNavigate(card.id)}
          >
            <CardContent className="p-6">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', card.iconBg)}>
                <div className={card.iconColor}>{card.icon}</div>
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{card.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
              <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all duration-200">
                Open <HiOutlineChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Outputs</h3>
        {displayOutputs.length === 0 ? (
          <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
            <CardContent className="p-8 text-center">
              <HiOutlineClock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No outputs yet. Start creating content to see your history here.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {displayOutputs.map((output) => (
                  <div key={output.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <TypeBadge type={output.type} />
                      <span className="text-sm font-medium text-foreground">{output.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{output.timestamp}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// --- Content Writer Screen ---
function ContentWriterScreen({
  addRecentOutput,
  showSampleData,
}: {
  addRecentOutput: (output: Omit<RecentOutput, 'id' | 'timestamp'>) => void
  showSampleData: boolean
}) {
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState('Blog Post')
  const [tone, setTone] = useState('Professional')
  const [targetAudience, setTargetAudience] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ContentWriterResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sampleLoaded, setSampleLoaded] = useState(false)

  useEffect(() => {
    if (showSampleData && !sampleLoaded && !result) {
      setTopic('The Future of AI in Digital Marketing')
      setContentType('Blog Post')
      setTone('Professional')
      setTargetAudience('Marketing professionals and business owners')
      setKeywords(['AI', 'digital marketing', 'personalization'])
      setResult(SAMPLE_CONTENT_RESPONSE)
      setSampleLoaded(true)
    }
  }, [showSampleData, sampleLoaded, result])

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed])
      setKeywordInput('')
    }
  }, [keywordInput, keywords])

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    const message = `Generate a ${contentType} about "${topic}" in a ${tone} tone for ${targetAudience || 'general audience'}. ${keywords.length > 0 ? `Include these keywords: ${keywords.join(', ')}` : ''} Format: ${contentType}`

    try {
      const res = await callAIAgent(message, CONTENT_WRITER_AGENT_ID)
      if (res.success) {
        let parsed = res.response?.result
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed)
        }
        const data: ContentWriterResponse = parsed ?? {}
        setResult(data)
        addRecentOutput({ type: 'content', title: data.title || topic })
      } else {
        setError(res.error ?? 'Failed to generate content. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [topic, contentType, tone, targetAudience, keywords, addRecentOutput])

  const handleCopy = useCallback(async () => {
    const text = result?.content ?? ''
    if (!text) return
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result])

  const wordCount = result?.word_count ?? 0
  const readTime = result?.estimated_read_time ?? ''

  return (
    <div className="p-8 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Content Writer</h2>
        <p className="text-sm text-muted-foreground">Generate high-quality marketing content powered by AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Topic *</Label>
              <Input
                placeholder="e.g., The Future of AI in Digital Marketing"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blog Post">Blog Post</SelectItem>
                    <SelectItem value="Ad Copy">Ad Copy</SelectItem>
                    <SelectItem value="Social Caption">Social Caption</SelectItem>
                    <SelectItem value="Email Newsletter">Email Newsletter</SelectItem>
                    <SelectItem value="Landing Page">Landing Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                    <SelectItem value="Bold">Bold</SelectItem>
                    <SelectItem value="Persuasive">Persuasive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Target Audience</Label>
              <Input
                placeholder="e.g., Marketing professionals"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Keywords</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a keyword..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={addKeyword} className="shrink-0">
                  Add
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1 text-xs">
                      <HiOutlineTag className="w-3 h-3" />
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-destructive">
                        <HiOutlineXMark className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
                <HiOutlineExclamationTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p>{error}</p>
                  <button onClick={handleGenerate} className="text-xs font-medium underline mt-1">
                    Try again
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output Panel */}
        <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Output</CardTitle>
              {result && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs h-8">
                    {copied ? (
                      <>
                        <HiOutlineCheck className="w-3.5 h-3.5 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <HiOutlineClipboardDocument className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5 text-xs h-8">
                    <HiOutlineArrowPath className="w-3.5 h-3.5" />
                    Regenerate
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : result ? (
              <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="pr-4">
                  {result.title && (
                    <h3 className="text-lg font-bold text-foreground mb-3">{result.title}</h3>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {wordCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <HiOutlineDocumentText className="w-3 h-3 mr-1" />
                        {wordCount} words
                      </Badge>
                    )}
                    {readTime && (
                      <Badge variant="secondary" className="text-xs">
                        <HiOutlineClock className="w-3 h-3 mr-1" />
                        {readTime}
                      </Badge>
                    )}
                    {result.content_type && (
                      <Badge variant="outline" className="text-xs">{result.content_type}</Badge>
                    )}
                    {result.tone && (
                      <Badge variant="outline" className="text-xs">{result.tone}</Badge>
                    )}
                  </div>
                  <Separator className="mb-4" />
                  <div>{renderMarkdown(result.content ?? '')}</div>
                  {Array.isArray(result.keywords_used) && result.keywords_used.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Keywords Used</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywords_used.map((kw, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <HiOutlinePencilSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-1">Your generated content will appear here</p>
                <p className="text-xs text-muted-foreground/60">Configure your settings and click Generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- SEO Analyzer Screen ---
function SEOAnalyzerScreen({
  addRecentOutput,
  showSampleData,
}: {
  addRecentOutput: (output: Omit<RecentOutput, 'id' | 'timestamp'>) => void
  showSampleData: boolean
}) {
  const [content, setContent] = useState('')
  const [analysisType, setAnalysisType] = useState<'full' | 'quick'>('full')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sampleLoaded, setSampleLoaded] = useState(false)

  useEffect(() => {
    if (showSampleData && !sampleLoaded && !result) {
      setContent('Artificial intelligence is rapidly transforming the digital marketing landscape. From personalized content recommendations to automated ad optimization, AI-powered tools are helping marketers achieve unprecedented results.')
      setResult(SAMPLE_SEO_RESPONSE)
      setSampleLoaded(true)
    }
  }, [showSampleData, sampleLoaded, result])

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    const message = `${analysisType === 'full' ? 'Perform a comprehensive SEO analysis' : 'Perform a quick SEO scan'} on the following content:\n\n${content}`

    try {
      const res = await callAIAgent(message, SEO_ANALYSIS_AGENT_ID)
      if (res.success) {
        let parsed = res.response?.result
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed)
        }
        const data: SEOResponse = parsed ?? {}
        setResult(data)
        addRecentOutput({ type: 'seo', title: `SEO ${analysisType === 'full' ? 'Full Analysis' : 'Quick Scan'}` })
      } else {
        setError(res.error ?? 'Failed to analyze content. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [content, analysisType, addRecentOutput])

  const overallScore = result?.overall_score ?? 0
  const readabilityScore = result?.readability_score ?? 0
  const primaryKw = Array.isArray(result?.keyword_analysis?.primary_keywords) ? result.keyword_analysis!.primary_keywords : []
  const secondaryKw = Array.isArray(result?.keyword_analysis?.secondary_keywords) ? result.keyword_analysis!.secondary_keywords : []
  const headingRecs = Array.isArray(result?.heading_recommendations) ? result.heading_recommendations : []
  const optTips = Array.isArray(result?.optimization_tips) ? result.optimization_tips : []
  const compInsights = Array.isArray(result?.competitive_insights) ? result.competitive_insights : []

  return (
    <div className="p-8 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">SEO Analyzer</h2>
        <p className="text-sm text-muted-foreground">Analyze and optimize your content for search engine performance.</p>
      </div>

      {/* Input Section */}
      <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75 mb-6">
        <CardContent className="p-5">
          <div className="mb-4">
            <Label className="text-sm font-medium mb-1.5 block">Content to Analyze</Label>
            <Textarea
              placeholder="Paste your content here or enter a URL/topic to analyze..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Analysis Type:</span>
              <Tabs value={analysisType} onValueChange={(v) => setAnalysisType(v as 'full' | 'quick')} className="h-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="full" className="text-xs h-7 px-3">Full Analysis</TabsTrigger>
                  <TabsTrigger value="quick" className="text-xs h-7 px-3">Quick Scan</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !content.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <HiOutlineMagnifyingGlass className="w-4 h-4 mr-2" />
                  Analyze SEO
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
              <HiOutlineExclamationTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p>{error}</p>
                <button onClick={handleAnalyze} className="text-xs font-medium underline mt-1">
                  Try again
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-border/60 backdrop-blur-[16px] bg-card/75">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result && !loading && (
        <ScrollArea className="h-[calc(100vh-26rem)]">
          <div className="pr-4 space-y-5 pb-8">
            {/* Score Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
                <CardContent className="p-5 flex flex-col items-center">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Overall SEO Score</p>
                  <SEOScoreGauge score={overallScore} size={130} />
                </CardContent>
              </Card>

              <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
                <CardContent className="p-5 flex flex-col items-center">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Readability Score</p>
                  <SEOScoreGauge score={readabilityScore} size={130} />
                  {result.readability_grade && (
                    <Badge variant="secondary" className="mt-3 text-xs">{result.readability_grade}</Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Content Length</p>
                  <div className="flex items-start gap-2">
                    <HiOutlineInformationCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/80">{result.content_length_assessment ?? 'No assessment available'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Keyword Analysis */}
            <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Keyword Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Primary Keywords</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Keyword</TableHead>
                          <TableHead className="text-xs text-right">Density</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {primaryKw.length > 0 ? primaryKw.map((kw, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm font-medium">{kw?.keyword ?? ''}</TableCell>
                            <TableCell className="text-sm text-right">
                              <Badge variant="secondary" className="text-xs">{kw?.density ?? ''}</Badge>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-sm text-muted-foreground text-center">No data</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Secondary Keywords</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Keyword</TableHead>
                          <TableHead className="text-xs text-right">Density</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {secondaryKw.length > 0 ? secondaryKw.map((kw, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm font-medium">{kw?.keyword ?? ''}</TableCell>
                            <TableCell className="text-sm text-right">
                              <Badge variant="secondary" className="text-xs">{kw?.density ?? ''}</Badge>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-sm text-muted-foreground text-center">No data</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meta Suggestions */}
            <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Meta Tag Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Suggested Title</Label>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/40 text-sm text-foreground">
                    {result.meta_suggestions?.title ?? 'No title suggestion available'}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Suggested Description</Label>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/40 text-sm text-foreground">
                    {result.meta_suggestions?.description ?? 'No description suggestion available'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Heading Recommendations & Optimization Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Heading Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  {headingRecs.length > 0 ? (
                    <ul className="space-y-2">
                      {headingRecs.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <HiOutlineChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No heading recommendations available.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Optimization Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  {optTips.length > 0 ? (
                    <ul className="space-y-2.5">
                      {optTips.map((tip, i) => (
                        <li key={i} className="flex items-start justify-between gap-2">
                          <span className="text-sm text-foreground/80 flex-1">{tip?.tip ?? ''}</span>
                          {tip?.priority && <PriorityBadge priority={tip.priority} />}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No optimization tips available.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Competitive Insights */}
            <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Competitive Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {compInsights.length > 0 ? (
                  <ul className="space-y-2">
                    {compInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <HiOutlineBolt className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No competitive insights available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}

      {!result && !loading && (
        <Card className="border border-border/60 backdrop-blur-[16px] bg-card/75">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <HiOutlineChartBar className="w-14 h-14 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-1">SEO analysis results will appear here</p>
            <p className="text-xs text-muted-foreground/60">Paste your content above and click Analyze</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Graphics Studio Screen ---
function GraphicsStudioScreen({
  addRecentOutput,
  showSampleData,
}: {
  addRecentOutput: (output: Omit<RecentOutput, 'id' | 'timestamp'>) => void
  showSampleData: boolean
}) {
  const [description, setDescription] = useState('')
  const [style, setStyle] = useState('Modern')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [graphicMeta, setGraphicMeta] = useState<GraphicResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<GeneratedImage[]>([])

  useEffect(() => {
    if (showSampleData && !imageUrl) {
      setDescription('A vibrant sunset gradient social media banner with modern typography')
      setStyle('Modern')
      setAspectRatio('16:9')
    }
  }, [showSampleData, imageUrl])

  const styles = ['Modern', 'Minimalist', 'Bold', 'Illustrative', 'Photographic']
  const aspects = ['1:1', '16:9', '4:5', '9:16']

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setImageUrl(null)
    setGraphicMeta(null)

    const message = `Create a ${style} style marketing visual: ${description}. Aspect ratio: ${aspectRatio}`

    try {
      const res = await callAIAgent(message, GRAPHIC_GENERATION_AGENT_ID)
      if (res.success) {
        let parsed = res.response?.result
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed)
        }
        const data: GraphicResponse = parsed ?? {}
        setGraphicMeta(data)

        // Extract image URL from multiple possible locations in the response
        let url = ''

        // 1. Check module_outputs.artifact_files (standard path)
        const files = Array.isArray(res.module_outputs?.artifact_files)
          ? res.module_outputs!.artifact_files
          : []
        url = files[0]?.file_url ?? files[0]?.url ?? ''

        // 2. Check module_outputs for direct url fields
        if (!url && res.module_outputs) {
          const mo = res.module_outputs as Record<string, any>
          url = mo.file_url ?? mo.url ?? mo.image_url ?? ''
          // Check if artifact_files uses a different shape
          if (!url && mo.artifact_files && typeof mo.artifact_files === 'object' && !Array.isArray(mo.artifact_files)) {
            url = mo.artifact_files.file_url ?? mo.artifact_files.url ?? ''
          }
        }

        // 3. Check the parsed result for image URLs
        if (!url && data) {
          const d = data as Record<string, any>
          url = d.image_url ?? d.file_url ?? d.url ?? d.image ?? ''
        }

        // 4. Check raw_response for module_outputs that may have been missed
        if (!url && res.raw_response) {
          try {
            const raw = typeof res.raw_response === 'string' ? JSON.parse(res.raw_response) : res.raw_response
            const rawMo = raw?.module_outputs ?? raw?.response?.module_outputs ?? raw?.data?.module_outputs
            if (rawMo) {
              const rawFiles = Array.isArray(rawMo.artifact_files) ? rawMo.artifact_files : []
              url = rawFiles[0]?.file_url ?? rawFiles[0]?.url ?? rawMo.file_url ?? rawMo.url ?? rawMo.image_url ?? ''
            }
            // Also check for image_url at top level of raw response
            if (!url) {
              url = raw?.image_url ?? raw?.file_url ?? raw?.response?.image_url ?? ''
            }
          } catch {
            // raw_response is not parseable, skip
          }
        }

        if (url) {
          setImageUrl(url)
          setHistory((prev) => [
            { url, description, style, timestamp: 'Just now' },
            ...prev.slice(0, 9),
          ])
          addRecentOutput({ type: 'graphic', title: description.slice(0, 50) })
        } else {
          setError('Image was generated but no file URL was returned. Please try again.')
        }
      } else {
        setError(res.error ?? 'Failed to generate graphic. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [description, style, aspectRatio, addRecentOutput])

  const handleDownload = useCallback(() => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = 'marketing-visual.png'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [imageUrl])

  return (
    <div className="p-8 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">Graphics Studio</h2>
        <p className="text-sm text-muted-foreground">Create AI-powered marketing visuals in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <Card className="lg:col-span-2 border border-border/60 backdrop-blur-[16px] bg-card/75">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Create Visual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description *</Label>
              <Textarea
                placeholder="Describe the marketing visual you want to create..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Style</Label>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
                      style === s
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card border-border text-foreground/70 hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
              <div className="flex gap-2">
                {aspects.map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 flex-1',
                      aspectRatio === ar
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card border-border text-foreground/70 hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <HiOutlineArrowPath className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="w-4 h-4 mr-2" />
                  Generate Graphic
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
                <HiOutlineExclamationTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p>{error}</p>
                  <button onClick={handleGenerate} className="text-xs font-medium underline mt-1">
                    Try again
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="lg:col-span-3 border border-border/60 backdrop-blur-[16px] bg-card/75 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview</CardTitle>
              {imageUrl && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDownload} className="gap-1.5 text-xs h-8">
                    <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5 text-xs h-8">
                    <HiOutlineArrowPath className="w-3.5 h-3.5" />
                    Regenerate
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 flex items-center justify-center rounded-xl bg-muted/20 border border-border/30 overflow-hidden min-h-[300px]">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-muted animate-pulse" />
                  <div className="space-y-2 flex flex-col items-center">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={graphicMeta?.image_description ?? description}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center text-center py-12">
                  <HiOutlinePhoto className="w-14 h-14 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-1">Your generated graphic will appear here</p>
                  <p className="text-xs text-muted-foreground/60">Describe your visual and click Generate</p>
                </div>
              )}
            </div>

            {/* Image metadata */}
            {graphicMeta && imageUrl && (
              <div className="flex flex-wrap gap-2 mt-3">
                {graphicMeta.style && <Badge variant="secondary" className="text-xs">Style: {graphicMeta.style}</Badge>}
                {graphicMeta.aspect_ratio && <Badge variant="secondary" className="text-xs">Ratio: {graphicMeta.aspect_ratio}</Badge>}
                {graphicMeta.image_description && (
                  <Badge variant="outline" className="text-xs max-w-[300px] truncate">{graphicMeta.image_description}</Badge>
                )}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Generation History</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {history.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setImageUrl(img.url)
                        setGraphicMeta({ image_description: img.description, style: img.style, aspect_ratio: '' })
                      }}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-border/50 shrink-0 hover:border-primary/50 transition-colors"
                    >
                      <img src={img.url} alt={img.description} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- Main Page ---
export default function Page() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')
  const [showSampleData, setShowSampleData] = useState(false)
  const [recentOutputs, setRecentOutputs] = useState<RecentOutput[]>([])

  const addRecentOutput = useCallback((output: Omit<RecentOutput, 'id' | 'timestamp'>) => {
    setRecentOutputs((prev) => {
      const newItem: RecentOutput = {
        ...output,
        id: generateId(),
        timestamp: 'Just now',
      }
      return [newItem, ...prev].slice(0, 10)
    })
  }, [])

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{
        background: 'linear-gradient(135deg, hsl(30 50% 97%) 0%, hsl(20 45% 95%) 35%, hsl(40 40% 96%) 70%, hsl(15 35% 97%) 100%)',
      }}
    >
      <AppSidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border/50 bg-background/50 backdrop-blur-[16px]">
          <div className="flex items-center gap-2">
            {activeScreen === 'dashboard' && (
              <h2 className="text-sm font-medium text-foreground">Dashboard</h2>
            )}
            {activeScreen === 'content' && (
              <>
                <button onClick={() => setActiveScreen('dashboard')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</button>
                <HiOutlineChevronRight className="w-3 h-3 text-muted-foreground" />
                <h2 className="text-sm font-medium text-foreground">Content Writer</h2>
              </>
            )}
            {activeScreen === 'seo' && (
              <>
                <button onClick={() => setActiveScreen('dashboard')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</button>
                <HiOutlineChevronRight className="w-3 h-3 text-muted-foreground" />
                <h2 className="text-sm font-medium text-foreground">SEO Analyzer</h2>
              </>
            )}
            {activeScreen === 'graphics' && (
              <>
                <button onClick={() => setActiveScreen('dashboard')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</button>
                <HiOutlineChevronRight className="w-3 h-3 text-muted-foreground" />
                <h2 className="text-sm font-medium text-foreground">Graphics Studio</h2>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={showSampleData}
              onCheckedChange={setShowSampleData}
            />
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              onNavigate={setActiveScreen}
              recentOutputs={recentOutputs}
              showSampleData={showSampleData}
            />
          )}
          {activeScreen === 'content' && (
            <ContentWriterScreen
              addRecentOutput={addRecentOutput}
              showSampleData={showSampleData}
            />
          )}
          {activeScreen === 'seo' && (
            <SEOAnalyzerScreen
              addRecentOutput={addRecentOutput}
              showSampleData={showSampleData}
            />
          )}
          {activeScreen === 'graphics' && (
            <GraphicsStudioScreen
              addRecentOutput={addRecentOutput}
              showSampleData={showSampleData}
            />
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
