export {
  isMcqQuestion,
  isEssayQuestion,
  isMultipleMcqQuestion,
  isMcqOptionSelected,
  toggleMcqPlayerSelection,
  isMcqAnswerCorrect,
  isMcqCorrectOption,
  mcqAnswerMatchesOptions,
  getQuestionOptions,
  parseMcqOptions,
  normalizeQuestion,
  migrateCategoryQuestions,
  defaultQuestionDraft,
  questionToDraft,
} from './data/mcq';
export type { NormalizeQuestionInput } from './data/mcq';

export {
  DEFAULT_INTRO_LINK_LABEL,
  compactIntroLinks,
  normalizeIntroLinks,
  getVisibleIntroLinks,
} from './data/intro-links';

export {
  createSampleState,
  makeCategory,
  SOUND_EVENT_LABELS,
  shuffleArray,
  findQuestionById,
  buildWheelSegments,
} from './data/sample-state';

export { parseQuestionsFromSheet } from './data/import-excel';
