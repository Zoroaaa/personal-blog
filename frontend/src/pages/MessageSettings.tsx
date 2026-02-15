/**
 * 私信设置页面组件
 *
 * 功能：
 * - 邮件通知开关
 * - 免打扰设置
 * - 允许陌生人私信设置
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';

interface MessageSettingsData {
  id?: number;
  userId: number;
  emailNotification: boolean;
  respectDnd: boolean;
  allowStrangers: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MessageSettingsProps {
  onClose?: () => void;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-primary' : 'bg-accent'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

function SettingItem({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1 pr-4">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function MessageSettings({ onClose }: MessageSettingsProps) {
  const { isAuthenticated } = useAuthStore();
  const [settings, setSettings] = useState<MessageSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = async () => {
    try {
      const response = await api.getMessageSettings();
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load message settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<MessageSettingsData>) => {
    if (!settings) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await api.updateMessageSettings({
        emailNotification: updates.emailNotification ?? settings.emailNotification,
        respectDnd: updates.respectDnd ?? settings.respectDnd,
        allowStrangers: updates.allowStrangers ?? settings.allowStrangers,
      });

      if (response.success && response.data) {
        setSettings(response.data);
        setSaveMessage('设置已保存');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to update message settings:', error);
      setSaveMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      {saveMessage && (
        <div
          className={`
            mb-4 p-3 rounded-lg text-sm
            ${saveMessage.includes('失败') ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}
          `}
        >
          {saveMessage}
        </div>
      )}

      <div className="bg-card rounded-lg">
        <SettingItem
          title="邮件通知"
          description="收到新私信时发送邮件通知"
        >
          <ToggleSwitch
            checked={settings?.emailNotification ?? true}
            onChange={(checked) => handleUpdateSettings({ emailNotification: checked })}
            disabled={saving}
          />
        </SettingItem>

        <SettingItem
          title="遵循免打扰时段"
          description="在免打扰时段内不发送邮件通知（需在通知设置中配置免打扰时段）"
        >
          <ToggleSwitch
            checked={settings?.respectDnd ?? true}
            onChange={(checked) => handleUpdateSettings({ respectDnd: checked })}
            disabled={saving}
          />
        </SettingItem>

        <SettingItem
          title="允许陌生人私信"
          description="允许未关注你的用户发送私信给你"
        >
          <ToggleSwitch
            checked={settings?.allowStrangers ?? true}
            onChange={(checked) => handleUpdateSettings({ allowStrangers: checked })}
            disabled={saving}
          />
        </SettingItem>
      </div>

      {onClose && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
