/**
 * Radix UI Components - Full Control Customization
 * Low-level primitives for when you need total design control
 *
 * Use these when shadcn/ui components aren't flexible enough
 */

'use client'

import React, { useState } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Button,
} from '@/components/ui'

export default function RadixUIDemo() {
  const [sortBy, setSortBy] = useState('recent')
  const [showArchived, setShowArchived] = useState(false)

  return (
    <div className="space-y-12 p-8">
      {/* Tabs Example - Research Categories */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Tabs - Research Categories</h2>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Active Hypotheses</h3>
              <p className="text-sm text-muted-foreground">
                Research currently in progress
              </p>
            </div>
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Completed Studies</h3>
              <p className="text-sm text-muted-foreground">
                Research with conclusions
              </p>
            </div>
          </TabsContent>
          <TabsContent value="archived" className="mt-6">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Archived Hypotheses</h3>
              <p className="text-sm text-muted-foreground">
                Previously completed research
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Switch Example - Visibility Toggle */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Switch - Display Options</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Switch
              id="archived-mode"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <label htmlFor="archived-mode" className="text-sm font-medium">
              Show archived hypotheses
            </label>
          </div>
          <div className="flex items-center gap-4">
            <Switch id="notifications" defaultChecked />
            <label htmlFor="notifications" className="text-sm font-medium">
              Enable notifications
            </label>
          </div>
        </div>
      </section>

      {/* Dropdown Menu Example - Sort & Filter */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Dropdown Menu - Sort & Filter</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Sort by: Recent</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortBy('recent')}>
              Most Recent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('views')}>
              Most Viewed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('popular')}>
              Most Popular
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Display Filters</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked>
              Published Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Include Drafts</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* Popover Example - Quick Preview */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Popover - Quick Preview</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">View Hypothesis Details</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Research Hypothesis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Effect of X on Y under conditions Z
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Status
                  </p>
                  <p className="font-semibold">Active</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Confidence
                  </p>
                  <p className="font-semibold">85%</p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Tooltip Example - Contextual Help */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Tooltips - Contextual Help</h2>
        <TooltipProvider>
          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This shows hypothesis metadata</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Confidence Score</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Based on statistical analysis of 500 samples</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </section>
    </div>
  )
}

/**
 * USAGE EXAMPLES FOR HYPOTHESIS PLATFORM
 *
 * TABS - Research workflow
 * ========================
 * <Tabs defaultValue="design">
 *   <TabsList>
 *     <TabsTrigger value="design">Design</TabsTrigger>
 *     <TabsTrigger value="conduct">Conduct</TabsTrigger>
 *     <TabsTrigger value="analyze">Analyze</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="design">{designForm}</TabsContent>
 * </Tabs>
 *
 * SWITCH - User preferences
 * ==========================
 * <Switch id="peer-review" />
 * <label htmlFor="peer-review">Require peer review</label>
 *
 * DROPDOWN - Advanced filtering
 * ================================
 * <DropdownMenu>
 *   <DropdownMenuTrigger>Filter Results</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuCheckboxItem>p < 0.05</DropdownMenuCheckboxItem>
 *     <DropdownMenuCheckboxItem>Peer reviewed</DropdownMenuCheckboxItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 *
 * POPOVER - Inline data viewing
 * ==============================
 * <Popover>
 *   <PopoverTrigger>View Stats</PopoverTrigger>
 *   <PopoverContent>
 *     <StatisticsPanel hypothesis={hypothesis} />
 *   </PopoverContent>
 * </Popover>
 *
 * TOOLTIP - Field explanations
 * =============================
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger>P-Value</TooltipTrigger>
 *     <TooltipContent>Probability of observing this result by chance</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 */
