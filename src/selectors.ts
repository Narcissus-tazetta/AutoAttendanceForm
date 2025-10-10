export const SELECTORS: {
    titleSelectors: string[];
    checkboxSelectors: string[];
    inputSelectors: string[];
    submitSelectors: string[];
    priorityCheckboxSelectors: string[];
    priorityInputSelectors: string[];
} = {
    titleSelectors: [
        'meta[itemprop="name"]',
        ".freebirdFormviewerViewHeaderTitle",
        ".F9yp7e.ikZYwf.LgNcQe",
        ".ahS2Le .F9yp7e",
        'div[role="heading"]',
        "h1",
        '[data-params*="title"]',
    ],

    checkboxSelectors: [
        "label.OLkl6c",
        "label.docssharedWizToggleLabeledContainer",
        'div[role="checkbox"]',
        'input[type="checkbox"]',
        'label[for*="checkbox"]',
        ".freebirdFormviewerComponentsQuestionCheckboxRoot label",
    ],

    inputSelectors: [
        "input.whsOnd.zHQkBf",
        'input[type="text"]',
        'input[type="email"]',
        "textarea",
        ".freebirdFormviewerComponentsQuestionTextRoot input",
        '[jsname="YPqjbf"]',
        'input[aria-label*="名前"]',
        'input[aria-label*="氏名"]',
        'input[placeholder*="名前"]',
    ],

    submitSelectors: [
        'div[role="button"][aria-label="Submit"]',
        'div[jsname="M2UYVd"]',
        "div.uArJ5e.UQuaGc.Y5sE8d.VkkpIf.QvWxOd",
        'span:contains("送信")',
        '[aria-label*="送信"]',
        '[aria-label*="Submit"]',
    ],

    priorityCheckboxSelectors: ["label.OLkl6c", 'div[role="checkbox"]', 'input[type="checkbox"]'],

    priorityInputSelectors: [
        "input.whsOnd.zHQkBf",
        'input[type="text"]',
        'input[aria-label*="名前"]',
        'input[aria-label*="氏名"]',
    ],
};

export const MESSAGES = {
    completionMessages: ["回答を記録しました", "送信完了", "ありがとうございました", "Your response has been recorded"],
} as const;

export const TIMINGS = {
    completionCheck: 500,
    retryInterval: 500,
    tabCloseDelay: 3000,
    fallbackRun: 2000,
    maxRetries: 2,
} as const;
