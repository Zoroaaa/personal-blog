/**
 * 通知设置页面
 *
 * 功能：
 * - 自定义通知偏好
 * - 系统通知设置
 * - 互动通知设置
 * - 免打扰设置
 * - 汇总邮件时间设置
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import type { PartialNotificationSettings } from '../types/notifications';

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
          inline-block h-4 w-4 transform rounded-full bg-card transition-transform
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
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FrequencySelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const options = [
    { value: 'realtime', label: '实时' },
    { value: 'daily', label: '每日汇总' },
    { value: 'weekly', label: '每周汇总' },
    { value: 'off', label: '关闭' },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        px-3 py-2 border border-border rounded-lg text-sm text-foreground
        focus:outline-none focus:ring-2 focus:ring-primary
        ${disabled ? 'bg-accent opacity-50' : 'bg-background'}
      `}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { settings, isSettingsLoading, fetchSettings, updateSettings } =
    useNotificationStore();
  const [, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  const handleUpdateSettings = async (
    newSettings: PartialNotificationSettings
  ) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateSettings(newSettings);
      setSaveMessage('设置已保存');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isSettingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm mt-3">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">通知设置</h1>
            <p className="text-muted-foreground text-sm mt-1">
              自定义你的通知偏好
            </p>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            返回通知中心
          </button>
        </div>

        {saveMessage && (
          <div
            className={`
              mb-4 p-3 rounded-lg text-sm
              ${saveMessage.includes('失败') ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}
            `}
          >
            {saveMessage}
          </div>
        )}

        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            系统通知
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            接收系统维护、功能更新等重要公告
          </p>

          <SettingItem
            title="站内通知"
            description="系统通知必须通过站内展示，无法关闭"
          >
            <ToggleSwitch
              checked={true}
              disabled={true}
              onChange={() => {}}
            />
          </SettingItem>

          <SettingItem
            title="邮件通知"
            description="通过邮件接收系统通知"
          >
            <ToggleSwitch
              checked={settings?.system.email ?? true}
              onChange={(checked) =>
                handleUpdateSettings({
                  system: { ...settings?.system, email: checked },
                })
              }
            />
          </SettingItem>

          <SettingItem title="通知频率">
            <FrequencySelect
              value={settings?.system.frequency ?? 'realtime'}
              onChange={(value) =>
                handleUpdateSettings({
                  system: { ...settings?.system, frequency: value as any },
                })
              }
            />
          </SettingItem>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            互动通知
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            接收评论、点赞、收藏等互动消息
          </p>

          <SettingItem
            title="站内通知"
            description="在网站内显示互动通知"
          >
            <ToggleSwitch
              checked={settings?.interaction.inApp ?? true}
              onChange={(checked) =>
                handleUpdateSettings({
                  interaction: { ...settings?.interaction, inApp: checked },
                })
              }
            />
          </SettingItem>

          <SettingItem
            title="邮件通知"
            description="通过邮件接收互动通知"
          >
            <ToggleSwitch
              checked={settings?.interaction.email ?? false}
              onChange={(checked) =>
                handleUpdateSettings({
                  interaction: { ...settings?.interaction, email: checked },
                })
              }
            />
          </SettingItem>

          <SettingItem title="通知频率">
            <FrequencySelect
              value={settings?.interaction.frequency ?? 'realtime'}
              onChange={(value) =>
                handleUpdateSettings({
                  interaction: {
                    ...settings?.interaction,
                    frequency: value as any,
                  },
                })
              }
            />
          </SettingItem>

          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">
              接收以下类型的互动通知
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'comment', label: '评论' },
                { key: 'reply', label: '回复' },
                { key: 'like', label: '点赞' },
                { key: 'favorite', label: '收藏' },
                { key: 'mention', label: '@提及' },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      settings?.interaction.subtypes?.[key as keyof typeof settings.interaction.subtypes] ??
                      true
                    }
                    onChange={(e) =>
                      handleUpdateSettings({
                        interaction: {
                          ...settings?.interaction,
                          subtypes: {
                            ...settings?.interaction.subtypes,
                            [key]: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            免打扰
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            设置免打扰时段，在此期间不会收到邮件通知
          </p>

          <SettingItem
            title="开启免打扰"
            description="在指定时间段内暂停邮件通知"
          >
            <ToggleSwitch
              checked={settings?.doNotDisturb.enabled ?? false}
              onChange={(checked) =>
                handleUpdateSettings({
                  doNotDisturb: { ...settings?.doNotDisturb, enabled: checked },
                })
              }
            />
          </SettingItem>

          {settings?.doNotDisturb.enabled && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    开始时间
                  </label>
                  <input
                    type="time"
                    value={settings?.doNotDisturb.start ?? '22:00'}
                    onChange={(e) =>
                      handleUpdateSettings({
                        doNotDisturb: {
                          ...settings?.doNotDisturb,
                          start: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    结束时间
                  </label>
                  <input
                    type="time"
                    value={settings?.doNotDisturb.end ?? '08:00'}
                    onChange={(e) =>
                      handleUpdateSettings({
                        doNotDisturb: {
                          ...settings?.doNotDisturb,
                          end: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            汇总邮件时间
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            设置每日和每周汇总邮件的发送时间
          </p>

          <SettingItem title="每日汇总时间">
            <input
              type="time"
              value={settings?.digestTime.daily ?? '09:00'}
              onChange={(e) =>
                handleUpdateSettings({
                  digestTime: {
                    ...settings?.digestTime,
                    daily: e.target.value,
                  },
                })
              }
              className="px-3 py-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </SettingItem>

          <SettingItem title="每周汇总时间">
            <div className="flex items-center gap-2">
              <select
                value={settings?.digestTime.weeklyDay ?? 1}
                onChange={(e) =>
                  handleUpdateSettings({
                    digestTime: {
                      ...settings?.digestTime,
                      weeklyDay: parseInt(e.target.value),
                    },
                  })
                }
                className="px-3 py-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                <option value={1}>周一</option>
                <option value={2}>周二</option>
                <option value={3}>周三</option>
                <option value={4}>周四</option>
                <option value={5}>周五</option>
                <option value={6}>周六</option>
                <option value={0}>周日</option>
              </select>
              <input
                type="time"
                value={settings?.digestTime.weeklyTime ?? '09:00'}
                onChange={(e) =>
                  handleUpdateSettings({
                    digestTime: {
                      ...settings?.digestTime,
                      weeklyTime: e.target.value,
                    },
                  })
                }
                className="px-3 py-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
          </SettingItem>
        </div>
      </div>
    </div>
  );
}
