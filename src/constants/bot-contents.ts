type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    CHART: 2,
    TUTORIAL: 3,
    PATEL_SIGNALS: 4,
    PATEL_SIGNAL_CENTER: 5,
    ANALYSIS_TOOL: 6,
    SIGNALS: 7,
    ADVANCED_ALGO: 8,
    FREE_BOTS: 9,
    SIGNAL_SAVVY: 10,
    FAST_LANE: 11,
    ZEN: 12,
    ELVIS_ZONE: 13,
    TICKSHARK: 14,
    COPY_TRADING: 15,
    ACCUMULATOR: 16,
    DIGIT_HACKER: 17,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-tutorials',
    'id-patel-signals',
    'id-patel-signal-center',
    'id-analysis-tool',
    'id-signals',
    'id-advanced-algo',
    'id-free-bots',
    'id-signal-savvy',
    'id-fast-lane',
    'id-zen',
    'id-elvis-zone',
    'id-tickshark',
    'id-copy-trading',
    'id-accumulator',
    'id-digit-hacker',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
