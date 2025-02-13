import Gon from 'gon';
import { camelizeKeys } from 'humps';

import GameRoomModes from '../config/gameModes';
import GameStateCodes from '../config/gameStateCodes';
import { taskStateCodes, taskVisibilityCodes } from '../config/task';
import userTypes from '../config/userTypes';
import {
  validateTaskName,
  validateInputSignatures,
  validateExamples,
  taskTemplatesStates,
  labelTaskParamsWithIds,
  getTaskTemplates,
} from '../utils/builder';
import {
  getGamePlayers,
  getGameStatus,
  getPlayersExecutionData,
  getPlayersText,
  makeEditorTextKey,
  setPlayerToSliceState,
} from '../utils/gameRoom';

// ******************************
//
// Stage 1: get all assets from Gon
//
// ******************************

const activeGamesData = Gon.getAsset('active_games');
const completedGamesData = Gon.getAsset('completed_games');
const currentUserParams = Gon.getAsset('current_user');
const gameData = Gon.getAsset('game');
const isRecord = Gon.getAsset('is_record') || false;
const playerId = Gon.getAsset('player_id');
const taskData = Gon.getAsset('task');
const tournamentData = Gon.getAsset('tournament');
const tournamentId = Gon.getAsset('tournament_id');
const tournamentsData = Gon.getAsset('tournaments');
const usersRatingData = Gon.getAsset('users_rating');
const langsData = Gon.getAsset('langs');

// ******************************
//
// Stage 2: Converting data from elixir naming to javascript
// Example: { "game_params": { "game_id": 10 } } -> { gameParams: { gameId: 10 } }
//
// ******************************

const gameParams = gameData ? camelizeKeys(gameData) : undefined;
const taskParams = taskData ? camelizeKeys(taskData) : undefined;
const tournamentParams = tournamentData
  ? camelizeKeys(tournamentData)
  : undefined;
const completedGamesParams = completedGamesData
  ? camelizeKeys(completedGamesData)
  : [];
const activeGamesParams = activeGamesData ? camelizeKeys(activeGamesData) : [];
const tournamentsParams = tournamentsData ? camelizeKeys(tournamentsData) : [];
const usersRatingParams = usersRatingData ? camelizeKeys(usersRatingData) : [];
const langsParams = langsData ? camelizeKeys(langsData) : [];
const currentUserId = currentUserParams ? currentUserParams.id : null;

// TODO: camelizeKeys initialUsers and refactor all selectors/reducers/components
const initialUsers = currentUserParams
  ? {
      [currentUserParams.id]: {
        ...currentUserParams,
        type: userTypes.spectator,
      },
    }
  : {};

// ******************************
//
// Stage 3: Initial data for redux slices
//
// ******************************

export const defaultGameStatusState = {
  state: GameStateCodes.initial,
  msg: '',
  type: null,
  mode: GameRoomModes.none,
  startsAt: null,
  score: null,
  timeoutSeconds: null,
  rematchState: null,
  rematchInitiatorId: null,
  checking: {},
  solutionStatus: null,
};

const initialGameStatus = gameParams
  ? {
      ...defaultGameStatusState,
      ...getGameStatus(gameParams),
    }
  : defaultGameStatusState;

const initialGameTask = gameParams ? gameParams.task : null;

const initialUseChat = gameParams ? gameParams.useChat : false;

const initialPlayers = gameParams
  ? getGamePlayers(gameParams.players).reduce(setPlayerToSliceState, {})
  : {};

const initialLangs = gameParams ? gameParams.langs : langsParams;

const setPlayersMetaToSliseState = (state, { userId, langSlug }) => ({
  ...state,
  [userId]: {
    userId,
    currentLangSlug: langSlug,
    historyCurrentLangSlug: langSlug,
  },
});

const setPlayersTextToSliseState = (
  state,
  { userId, editorText, langSlug },
) => ({
  ...state,
  [makeEditorTextKey(userId, langSlug)]: editorText,
});

const setPlayersLangToSliseState = (state, { userId, langSlug }) => ({
  ...state,
  [userId]: langSlug,
});

const initialMeta = gameParams
  ? gameParams.players
      .map(getPlayersText)
      .reduce(setPlayersMetaToSliseState, {})
  : {};

const initialText = gameParams
  ? gameParams.players
      .map(getPlayersText)
      .reduce(setPlayersTextToSliseState, {})
  : {};

const initialLangsHistory = gameParams && isRecord
    ? gameParams.players
        .map(getPlayersText)
        .reduce(setPlayersLangToSliseState, {})
    : {};

const setPlayersResultsToSliceState = (state, { userId, ...rest }) => ({
  ...state,
  [userId]: rest,
});

const initialResults = gameParams
  ? gameParams.players
      .map(getPlayersExecutionData)
      .reduce(setPlayersResultsToSliceState, {})
  : {};

const defaultTaskParams = {
  name: '',
  level: 'elementary',
  state: taskStateCodes.none,
  descriptionEn: '',
  descriptionRu: '',
  inputSignature: [],
  outputSignature: { type: { name: 'integer' } },
  assertsExamples: [],
  asserts: [],
  examples: '',
  solution: '',
  argumentsGenerator: '',
  generatorLang: 'js',
  visibility: taskVisibilityCodes.hidden,
};

const defaultTaskTemplates = {
  state: taskTemplatesStates.loading,
  solution: {},
  argumentsGenerator: {},
};

const defaultTaskAssertsStatus = {
  status: 'none',
  output: '',
};

const defaultValidationStatuses = {
  name: [false],
  description: [false],
  solution: [true],
  argumentsGenerator: [true],
  inputSignature: [false],
  outputSignature: [true],
  assertsExamples: [false],
};

const getTaskValidationStatuses = task => ({
  ...defaultValidationStatuses,
  name: validateTaskName(task.name),
  description: validateTaskName(task.descriptionEn),
  inputSignature: validateInputSignatures(task.inputSignature),
  assertsExamples: validateExamples(task.assertsExamples),
});

const initialTask = taskParams
  ? labelTaskParamsWithIds(taskParams)
  : defaultTaskParams;
const initialTemplates = taskParams
  ? getTaskTemplates(taskData)
  : defaultTaskTemplates;
const initialAssertsStatus = taskParams ? taskData : defaultTaskAssertsStatus;
const initialValidationStatuses = taskParams
  ? getTaskValidationStatuses(taskParams)
  : defaultValidationStatuses;

const defaultTournamentParams = {
  id: null,
  level: 'elementary',
  isLive: false,
  creator: {},
  creatorId: null,
  type: null,
  state: 'loading',
  name: '',
  matches: {},
  gameResults: {},
  players: {},
  playersLimit: 128,
  playersCount: 0,
  startsAt: null,
  insertedAt: null,
  meta: {
    roundsLimit: 1,
    teams: [],
  },

  accessType: 'token',
  accessToken: null,
  currentRound: null,
  defaultLanguage: 'js',
  lastRoundStartedAt: null,
  matchTimeoutSeconds: 0,
  playedPairIds: [],

  breakState: 'off',

  taskStrategy: 'game',
  taskProvider: 'level',

  playersPageNumber: 1,
  playersPageSize: 20,

  channel: { online: false },
  useChat: false,
};

const initialTournament = tournamentParams
  ? {
      ...defaultTournamentParams,
      ...tournamentParams,
      channel: { online: !tournamentParams.isLive },
    }
  : defaultTournamentParams;

const initialLiveTournaments = tournamentsParams.filter(x => x.isLive);
const initialCompletedTournaments = tournamentsParams.filter(x => !x.isLive);

const defaultTournamentPlayerParams = {
  tournamentId,
  playerId,
  gameId: null,
  channel: { online: false },
};

// ******************************
//
// Stage 4: Combine all slices data
//
// ******************************

/**
 * @typedef {{
 *  avatarUrl: string,
 *  checkResult: Object,
 *  creator: boolean,
 *  durationSec: number,
 *  editorLang: string,
 *  editorText: string,
 *  id: number,
 *  isBot: boolean,
 *  isGuest: boolean,
 *  lang: string,
 *  name: string,
 *  rank: number,
 *  rating: number,
 *  ratingDiff: number,
 *  result: string,
 *  resultPercent: number,
 * }} Player
 * @typedef {{
 *  state: string,
 *  msg: string,
 *  type: string,
 *  mode: string,
 *  startsAt: string,
 *  score: Object,
 *  timeoutSeconds: number,
 *  rematchState: string,
 *  rematchInitiatorId: number,
 *  checking: Object,
 *  solutionStatus: {?string},
 * }} GameStatusState
 * @typedef {{
 *  id: number,
 *  name: string,
 *  level: string,
 *  examples: string,
 *  descriptionRu: {?string},
 *  descriptionEn: {?string},
 *  tags: string[],
 *  state: string,
 *  origin: string,
 *  visibility: boolean,
 *  creatorId: number,
 *  inputSignature: Object[],
 *  outputSignature: Object,
 *  asserts: Object[],
 *  assertsExamples: Object[],
 *  solution: string,
 *  argumentsGenerator: string,
 *  generatorLang: string,
 * }} TaskState
 * @typedef {{
 *   gameStatus: GameStatusState,
 *   task: TaskState,
 *   players: Object<number, Player>,
 *   tournamentsInfo: {?Object},
 *   useChat: boolean,
 *   alerts: Object,
 * }} GameState
 * @typedef {{
 *   accessToken: string,
 *   accessType: string,
 *   breakDurationSeconds: number,
 *   breakState: string,
 *   currentRound: number,
 *   defaultLanguage: string,
 *   description: string,
 *   level: string,
 *   matchTimeoutSeconds: number,
 *   matches: Object<number, Match>,
 *   lastRoundStartedAt: string,
 *   lastRoundEndedAt: string,
 *   meta: Object,
 *   name: string,
 *   playedPairIds: number[],
 *   players: Object<number, Player>,
 *   playersCount: number,
 *   playersLimit: number,
 *   startsAt: string,
 *   state: string,
 *   taskStrategy: string,
 *   type: string,
 *   useChat: boolean,
 * }} TournamentState
 *
 * @const {{
 *   game: GameState,
 *   tournament: TournamentState,
 *   tournamentPlayer: Object,
 *   editor: Object,
 *   executionOutput: Object,
 *   builder: Object,
 *   activeGames: Object,
 *   completedGames: Object,
 *   liveTournaments: Object,
 *   completedTournaments: Object,
 *   user: Object,
 * }}
 *
 */
export default {
  game: {
    gameStatus: initialGameStatus,
    task: initialGameTask,
    players: initialPlayers,
    tournamentsInfo: null,
    useChat: initialUseChat,
    alerts: {},
  },
  tournament: initialTournament,
  tournamentPlayer: defaultTournamentPlayerParams,
  editor: {
    meta: initialMeta,
    text: initialText,
    textHistory: isRecord ? initialText : {},
    langs: initialLangs,
    langsHistory: initialLangsHistory,
  },
  executionOutput: {
    results: initialResults,
    historyResults: isRecord ? initialResults : {},
  },
  builder: {
    task: initialTask,
    templates: initialTemplates,
    assertsStatus: initialAssertsStatus,
    validationStatuses: initialValidationStatuses,
    textArgumentsGenerator: initialTemplates.argumentsGenerator,
    textSolution: initialTemplates.solution,
    generatorLang: initialTask.generatorLang,
  },
  activeGames: activeGamesParams,
  completedGames: completedGamesParams,
  liveTournaments: initialLiveTournaments,
  completedTournaments: initialCompletedTournaments,
  user: {
    currentUserId,
    users: initialUsers,
    usersStats: {},
    usersRatingPage: {
      users: usersRatingParams,
      pageInfo: { totalEntries: 0 },
      dateFrom: null,
      withBots: false,
    },
    settings: {
      ...currentUserParams,
      mute: JSON.parse(localStorage.getItem('ui_mute_sound')),
    },
  },
};
