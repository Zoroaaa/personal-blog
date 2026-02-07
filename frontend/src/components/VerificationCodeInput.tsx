/**
 * 邮箱验证码组件
 * 
 * 功能:
 * - 发送验证码
 * - 倒计时显示
 * - 验证码输入
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface VerificationCodeInputProps {
  email: string;
  type: 'register' | 'reset_password' | 'delete_account' | 'change_email';
  username?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  email,
  type,
  username,
  value,
  onChange,
  className = '',
}) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      setError('请先输入邮箱地址');
      return;
    }

    if (countdown > 0) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const result = await api.sendVerificationCode({
        email,
        type,
        username,
      });

      setSent(true);
      setCountdown(60); // 60秒倒计时
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        验证码
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入6位验证码"
          maxLength={6}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending || countdown > 0}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            sending || countdown > 0
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {sending ? '发送中...' : countdown > 0 ? `${countdown}秒后重发` : sent ? '重新发送' : '发送验证码'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {sent && !error && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          验证码已发送至 {email}，请查收邮件
        </p>
      )}
    </div>
  );
};
