import {
  STORY_COMPETENCIES,
  type StoryBankEntryRecord,
  type StoryCompetency,
  type StoryUsageRecord,
} from "@/lib/application-model"

export function buildStoryBankModel(args: {
  stories: StoryBankEntryRecord[]
  usages: StoryUsageRecord[]
}) {
  const stories = args.stories.filter((story) => !story.archived)
  const usageByStory = new Map<string, StoryUsageRecord[]>()
  for (const usage of args.usages) {
    usageByStory.set(usage.storyId, [...(usageByStory.get(usage.storyId) ?? []), usage])
  }

  const competencyCoverage = STORY_COMPETENCIES.map((competency) => ({
    competency,
    count: stories.filter((story) => story.competencies.includes(competency)).length,
  }))

  const missingCompetencies = competencyCoverage
    .filter((item) => item.count === 0)
    .map((item) => item.competency)

  return {
    rows: stories
      .map((story) => ({
        story,
        usages: usageByStory.get(story.id) ?? [],
        completeness: storyCompleteness(story),
      }))
      .sort((a, b) => b.completeness - a.completeness),
    competencyCoverage,
    missingCompetencies,
    summary: {
      total: stories.length,
      ready: stories.filter((story) => storyCompleteness(story) >= 80).length,
      unused: stories.filter((story) => !(usageByStory.get(story.id) ?? []).length).length,
    },
  }
}

export function storyCompleteness(story: StoryBankEntryRecord) {
  const required = [story.situation, story.task, story.action, story.result]
  const requiredScore = (required.filter((value) => value.trim().length >= 20).length / required.length) * 60
  const evidenceScore = story.impactMetrics?.trim() ? 15 : 0
  const competencyScore = Math.min(15, story.competencies.length * 5)
  const seniorityScore = story.senioritySignal?.trim() ? 10 : 0
  return Math.round(requiredScore + evidenceScore + competencyScore + seniorityScore)
}

export function competencyLabel(competency: StoryCompetency) {
  return competency.replace(/_/g, " ")
}
