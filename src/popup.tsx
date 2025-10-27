import * as React from "react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { storageGet, storageSet } from "./shared/storageHelper";

const App = () => {
    const [name, setName] = useState("");
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [autoSubmit, setAutoSubmit] = useState(false);
    const [helpVisible, setHelpVisible] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await storageGet(["userName", "autoSubmit"]);
                if (data.userName) {
                    setName(data.userName);
                    setAutoSubmit(data.autoSubmit || false);
                }
            } catch (e) {
                console.debug("[AAF] popup: failed to load settings", e);
            }
        })();
    }, []);

    const onSave = async () => {
        if (!name) {
            setError("名前を入力してください");
            return;
        }
        setError("");
        try {
            const success = await storageSet({ userName: name });
            if (success) {
                setSaved(true);
                setError("");
                setTimeout(() => setSaved(false), 2000);
            } else {
                setError("保存に失敗しました");
            }
        } catch (e) {
            console.error(e);
            setError("保存に失敗しました");
        }
    };

    const onAutoChange = async (v: boolean) => {
        setAutoSubmit(v);
        try {
            await storageSet({ autoSubmit: v });
        } catch (e) {
            console.debug("[AAF] popup.onAutoChange: failed to persist autoSubmit", e);
        }
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
