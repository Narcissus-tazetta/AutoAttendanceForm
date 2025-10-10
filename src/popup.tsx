import * as React from "react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

async function getBrowser() {
    if ((globalThis as any).browser) return (globalThis as any).browser;
    try {
        const mod = await import("webextension-polyfill");
        return (mod as any).default || (mod as any);
    } catch (e) {
        return null;
    }
}

const App = () => {
    const [name, setName] = useState("");
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [autoSubmit, setAutoSubmit] = useState(false);
    const [helpVisible, setHelpVisible] = useState(false);

    useEffect(() => {
        (async () => {
            const b = await getBrowser();
            if (!b) return;
            try {
                const res: any = await b.storage.sync.get(["userName", "autoSubmit"]);
                if (res && res.userName) {
                    setName(res.userName);
                }
                setAutoSubmit(res && res.autoSubmit ? res.autoSubmit : false);
                return;
            } catch (e) {
                // fallback
            }

            try {
                const resLocal: any = await b.storage.local.get(["userName", "autoSubmit"]);
                if (resLocal && resLocal.userName) setName(resLocal.userName);
                setAutoSubmit(resLocal && resLocal.autoSubmit ? resLocal.autoSubmit : false);
                return;
            } catch (e) {
                // fallback
            }

            try {
                const resMsg = await b.runtime.sendMessage({ action: "getSavedSettings" });
                if (resMsg) {
                    if (resMsg.userName) setName(resMsg.userName);
                    setAutoSubmit(resMsg.autoSubmit || false);
                }
            } catch (e) {
                // nothing
            }
        })();
    }, []);

    const onSave = async () => {
        if (!name) {
            setError("名前を入力してください");
            return;
        }
        setError("");
        const b = await getBrowser();
        if (!b) {
            setError("保存に失敗しました");
            return;
        }
        try {
            await b.storage.sync.set({ userName: name });
            setSaved(true);
            setError("");
            setTimeout(() => setSaved(false), 2000);
            return;
        } catch (e) {
            try {
                await b.storage.local.set({ userName: name });
                setSaved(true);
                setError("");
                setTimeout(() => setSaved(false), 2000);
                return;
            } catch (e2) {
                try {
                    const res = await b.runtime.sendMessage({ action: "saveUserName", userName: name });
                    if (res && res.success) {
                        setSaved(true);
                        setError("");
                        setTimeout(() => setSaved(false), 2000);
                        return;
                    }
                } catch (e3) {
                    console.debug("[AAF] popup.onSave: runtime message error", e3);
                }
            }
            console.error(e);
            setError("保存に失敗しました");
        }
    };

    const onAutoChange = async (v: boolean) => {
        setAutoSubmit(v);
        const b = await getBrowser();
        if (!b) return;
        try {
            await b.storage.sync.set({ autoSubmit: v });
            return;
        } catch (e) {}
        try {
            await b.storage.local.set({ autoSubmit: v });
            return;
        } catch (e) {}
        try {
            await b.runtime.sendMessage({ action: "saveAutoSubmit", autoSubmit: v });
        } catch (e) {}
    };

    return (
        <div className="popup-root">
            <div className="font-playwrite text-base font-semibold mb-2">Automatic Attendance Form</div>
            <label className="block mb-1">名前</label>
            <input
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                }}
                className="w-full p-2 rounded-md border border-[#2196f3] box-border"
                placeholder="例：山田太郎"
            />
            <button onClick={onSave} className="save-button mt-2 rounded-md">
                保存する
            </button>
            {saved && <div className="text-green-600 text-sm mt-2">保存完了</div>}
            {error && <div className="text-red-700 text-sm mt-2">{error}</div>}

            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center">
                    <span>自動送信</span>
                    <button
                        type="button"
                        aria-expanded={helpVisible}
                        aria-controls="autoSubmitHelp"
                        onClick={() => setHelpVisible((v) => !v)}
                        className="help-button border-[#2196f3] text-[#2196f3] ml-2"
                    >
                        ?
                    </button>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={autoSubmit}
                    onClick={() => onAutoChange(!autoSubmit)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onAutoChange(!autoSubmit);
                        }
                    }}
                    className="switch-btn"
                    style={{
                        width: 40,
                        height: 22,
                        background: autoSubmit ? "#2196f3" : "#ccc",
                        justifyContent: autoSubmit ? "flex-end" : "flex-start",
                        cursor: "pointer",
                        padding: 2,
                        border: "none",
                    }}
                >
                    <span className="switch-circle" style={{ width: 16, height: 16 }} />
                </button>
            </div>
            {helpVisible && (
                <div id="autoSubmitHelp" style={{ marginTop: 8, fontSize: 12, color: "#333" }}>
                    フォーム送信後、タブを自動で閉じます。
                </div>
            )}
        </div>
    );
};

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
