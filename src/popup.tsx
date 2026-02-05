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
            console.debug("[AAF] popup: failed to persist", e);
        }
    };

    return (
        <div className="w-[320px] rounded-md bg-cyan-50 p-3 font-sans text-slate-800">
            <div className="font-playwrite mb-2 text-base font-semibold">Automatic Attendance Form</div>
            <label htmlFor="userNameInput" className="mb-1 block text-sm font-medium">
                名前
            </label>
            <input
                id="userNameInput"
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                }}
                className="w-full rounded-md border border-primary p-2 outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="例：山田太郎"
            />
            <button
                onClick={onSave}
                className="mt-2 w-full rounded-md bg-primary py-2 text-white transition hover:brightness-90 active:translate-y-px"
            >
                保存する
            </button>

            {saved && <div className="mt-2 text-sm text-green-600">保存完了</div>}
            {error && <div className="mt-2 text-sm text-red-700">{error}</div>}

            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center text-sm">
                    <span>自動送信</span>
                    <button
                        type="button"
                        aria-label="ヘルプを表示"
                        aria-expanded={helpVisible}
                        onClick={() => setHelpVisible((v: boolean) => !v)}
                        className="ml-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary text-xs text-primary hover:bg-primary/10"
                    >
                        ?
                    </button>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={autoSubmit}
                    onClick={() => onAutoChange(!autoSubmit)}
                    className={`
                        relative h-5 w-10 px-1 flex items-center cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50
                        ${autoSubmit ? "bg-primary" : "bg-gray-300"}
                    `}
                >
                    <span
                        aria-hidden="true"
                        className={`
                            pointer-events-none absolute left-1 top-1/2 transform -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                            ${autoSubmit ? "translate-x-4" : "translate-x-0"}
                        `}
                    />
                </button>
            </div>
            {helpVisible && <div className="mt-2 text-xs text-slate-600">フォーム送信後、タブを自動で閉じます。</div>}
        </div>
    );
};

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
