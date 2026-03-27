"use client";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/store";
import { useSettingsStore, Locale } from "@/lib/settingsStore";
import { Navbar } from "@/components/layout/Navbar";
import { ApiKeyDrawer } from "@/components/settings/ApiKeyDrawer";
import { Video, Key, FolderOpen, RotateCcw, AlertCircle, Download, Check, Loader2, Globe, ArrowLeft, Info, ExternalLink, Mail, LogOut } from "lucide-react";
import Link from "next/link";

interface DataPathInfo {
  current: string;
  default: string;
}

interface UpdateInfo {
  type: string;
  version?: string;
  currentVersion?: string;
  percent?: number;
  error?: string;
}

interface ElectronAPI {
  getDataPath: () => Promise<DataPathInfo>;
  selectDataPath: () => Promise<{ success: boolean; path: string }>;
  resetDataPath: () => Promise<{ success: boolean; path: string }>;
  checkForUpdates: () => Promise<{ available: boolean; version?: string | null; currentVersion?: string; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall: () => void;
  onUpdateMessage: (callback: (data: UpdateInfo) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const PRODUCT_WEBSITE = process.env.NEXT_PUBLIC_PRODUCT_WEBSITE || "";
const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "";

export default function AccountPage() {
  const { user, fetchMe, logout } = useAuthStore();
  const { t } = useTranslation();
  const { locale, setLocale } = useSettingsStore();
  const [showApiKeyDrawer, setShowApiKeyDrawer] = useState(false);
  const [dataPath, setDataPath] = useState<DataPathInfo | null>(null);
  const [showRestartAlert, setShowRestartAlert] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  const [updateStatus, setUpdateStatus] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("1.0.0");

  const getElectronAPI = () => {
    if (typeof window === "undefined") return null;
    return window.electronAPI || null;
  };

  const loadDataPath = useEffectEvent(async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;

    try {
      const info = await electronAPI.getDataPath();
      setDataPath(info);
    } catch (error: unknown) {
      console.error("Failed to get data path:", error);
    }
  });

  useEffect(() => {
    fetchMe();

    const electronAPI = getElectronAPI();
    if (electronAPI) {
      startTransition(() => {
        setIsElectron(true);
      });
      loadDataPath();

      electronAPI.onUpdateMessage((data: UpdateInfo) => {
        setUpdateStatus(data);
        if (data.type === 'available' && data.currentVersion) {
          setCurrentVersion(data.currentVersion);
        }
      });
    }
  }, [fetchMe]);

  const handleSelectPath = async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI || !dataPath) return;

    try {
      const result = await electronAPI.selectDataPath();
      if (result.success) {
        setDataPath({ ...dataPath, current: result.path });
        setShowRestartAlert(true);
      }
    } catch (error: unknown) {
      console.error("Failed to select data path:", error);
    }
  };

  const handleResetPath = async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI || !dataPath) return;

    try {
      const result = await electronAPI.resetDataPath();
      if (result.success) {
        setDataPath({ ...dataPath, current: result.path });
        setShowRestartAlert(true);
      }
    } catch (error: unknown) {
      console.error("Failed to reset data path:", error);
    }
  };

  const handleCheckUpdate = async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;

    setCheckingUpdate(true);
    try {
      const result = await electronAPI.checkForUpdates();
      if (result.available) {
        setUpdateStatus({ type: 'available', version: result.version, currentVersion: result.currentVersion });
      } else {
        setUpdateStatus(result.error ? { type: "error", error: result.error } : { type: 'not-available' });
      }
    } catch (error: unknown) {
      console.error("Failed to check updates:", error);
    }
    setCheckingUpdate(false);
  };

  const handleDownloadUpdate = async () => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;

    try {
      await electronAPI.downloadUpdate();
    } catch (error: unknown) {
      console.error("Failed to download update:", error);
    }
  };

  const handleQuitAndInstall = () => {
    const electronAPI = getElectronAPI();
    electronAPI?.quitAndInstall();
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#0c0a08]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard">
            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-white">{t("account.title")}</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center text-2xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-white text-lg">{user?.name || t("account.defaultName")}</p>
              <p className="text-gray-500 text-sm">{user?.email || t("account.defaultEmail")}</p>
            </div>
          </div>
        </div>

        {showRestartAlert && (
          <div className="mb-6 p-4 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-orange-200 font-medium">{t("account.restartRequired")}</p>
              <p className="text-xs text-orange-300/80 mt-1">
                {t("account.restartMessage")}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link href="/dashboard">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Video size={16} /> {t("account.myProjects")}
            </button>
          </Link>

          <button
            onClick={() => setShowApiKeyDrawer(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <Key size={16} /> {t("account.apiKeys")}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-200 transition-colors"
          >
            <LogOut size={16} /> {t("account.logout")}
          </button>

          {isElectron && dataPath && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={16} className="text-gray-400" />
                <span className="text-sm text-gray-300">{t("account.dataStorageLocation")}</span>
              </div>

              <div className="mb-3 p-2.5 rounded-lg bg-black/30 border border-white/5">
                <p className="text-xs text-gray-500 mb-1">{t("account.currentPath")}</p>
                <p className="text-sm text-gray-300 font-mono break-all">{dataPath.current}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSelectPath}
                  className="flex-1 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm transition-colors"
                >
                  {t("account.changeLocation")}
                </button>
                {dataPath.current !== dataPath.default && (
                  <button
                    onClick={handleResetPath}
                    className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    title={t("account.resetToDefault")}
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {isElectron && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-300">{t("account.appUpdates")}</span>
                </div>
                <span className="text-xs text-gray-500">v{currentVersion}</span>
              </div>

              {updateStatus?.type === 'checking' && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  {t("account.update.checking")}
                </div>
              )}

              {updateStatus?.type === 'available' && (
                <div className="space-y-3">
                  <p className="text-sm text-orange-300">
                    {t("account.update.available", { version: updateStatus.version })}
                  </p>
                  <button
                    onClick={handleDownloadUpdate}
                    className="w-full px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm transition-colors"
                  >
                    {t("account.update.download")}
                  </button>
                </div>
              )}

              {updateStatus?.type === 'progress' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">{t("account.update.downloading", { percent: updateStatus.percent?.toFixed(0) })}</p>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${updateStatus.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {updateStatus?.type === 'downloaded' && (
                <div className="space-y-3">
                  <p className="text-sm text-green-400 flex items-center gap-1">
                    <Check size={14} /> {t("account.update.downloaded")}
                  </p>
                  <button
                    onClick={handleQuitAndInstall}
                    className="w-full px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm transition-colors"
                  >
                    {t("account.update.restartInstall")}
                  </button>
                </div>
              )}

              {updateStatus?.type === 'not-available' && (
                <p className="text-sm text-gray-500">{t("account.update.upToDate")}</p>
              )}

              {updateStatus?.type === 'error' && (
                <p className="text-sm text-red-400">{t("account.update.checkFailed", { error: updateStatus.error })}</p>
              )}

              {(!updateStatus || updateStatus.type === 'not-available') && (
                <button
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors disabled:opacity-50"
                >
                  {checkingUpdate ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      {t("account.update.checkingShort")}
                    </span>
                  ) : (
                    t("account.update.checkButton")
                  )}
                </button>
              )}
            </div>
          )}
          {/* Language Switcher */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300">{t("account.language")}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["zh", "en", "ja", "ko"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLocale(lang)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    locale === lang
                      ? "bg-orange-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t(`language.${lang}`)}
                </button>
              ))}
            </div>
          </div>

          {(PRODUCT_WEBSITE || FEEDBACK_EMAIL) && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300">{t("account.about.title")}</span>
            </div>

            <div className="space-y-2">
              {PRODUCT_WEBSITE && (
              <a
                href={PRODUCT_WEBSITE}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-sm text-white">{t("account.about.officialSite")}</p>
                  <p className="text-xs text-gray-400">{PRODUCT_WEBSITE}</p>
                </div>
                <ExternalLink size={14} className="text-gray-500" />
              </a>
              )}

              {FEEDBACK_EMAIL && (
              <a
                href={`mailto:${FEEDBACK_EMAIL}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-sm text-white">{t("account.about.contactFeedback")}</p>
                  <p className="text-xs text-gray-400">{FEEDBACK_EMAIL}</p>
                </div>
                <Mail size={14} className="text-gray-500" />
              </a>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      <ApiKeyDrawer
        open={showApiKeyDrawer}
        onClose={() => setShowApiKeyDrawer(false)}
      />
    </div>
  );
}
