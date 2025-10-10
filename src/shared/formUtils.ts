export function findSubmitButtons(scope: ParentNode = document): Element[] {
    const candidates = Array.prototype.slice.call(
        scope.querySelectorAll('button, [role="button"], div[role="button"], input[type="submit"], a')
    ) as Element[];
    const textMatchRx = /送信|Submit|送信する/i;
    const matched: Element[] = [];
    for (const el of candidates) {
        const text = ((el.textContent || "") + " " + ((el.getAttribute && el.getAttribute("aria-label")) || "")).trim();
        if (!text) continue;
        if (textMatchRx.test(text)) {
            const rect = (el as HTMLElement).getBoundingClientRect && (el as HTMLElement).getBoundingClientRect();
            if (!rect || (rect.width === 0 && rect.height === 0)) continue;
            matched.push(el);
        }
    }
    return matched;
}

export function waitForSelector(selector: string, timeout = 3000): Promise<Element | null> {
    const existing = document.querySelector(selector);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
        const mo = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                mo.disconnect();
                resolve(el);
            }
        });
        mo.observe(document, { childList: true, subtree: true });
        setTimeout(() => {
            mo.disconnect();
            resolve(null);
        }, timeout);
    });
}

export function waitForTextMatch(patterns: string[], timeout = 3000): Promise<string | null> {
    const bodyText = (document.body && document.body.innerText) || "";
    for (const p of patterns) {
        if (bodyText.indexOf(p) !== -1) return Promise.resolve(p);
    }
    return new Promise((resolve) => {
        const mo = new MutationObserver(() => {
            const t = (document.body && document.body.innerText) || "";
            for (const p of patterns) {
                if (t.indexOf(p) !== -1) {
                    mo.disconnect();
                    resolve(p);
                    return;
                }
            }
        });
        mo.observe(document.body || document.documentElement || document, { childList: true, subtree: true });
        setTimeout(() => {
            mo.disconnect();
            resolve(null);
        }, timeout);
    });
}
