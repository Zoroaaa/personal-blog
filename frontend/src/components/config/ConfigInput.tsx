/**
 * 单个配置项的输入控件渲染（按 type 分派）
 */

import type { ConfigItem } from './configSchema';

interface ConfigInputProps {
  item: ConfigItem;
  value: any;
  error?: string;
  techStackInput: string;
  onChange: (key: string, value: any) => void;
  onTechStackChange: (value: string) => void;
}

export function ConfigInput({
  item,
  value,
  error,
  techStackInput,
  onChange,
  onTechStackChange,
}: ConfigInputProps) {
  switch (item.type) {
    case 'boolean':
      return (
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onChange(item.key, !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-muted-foreground">
            {value ? '已启用' : '已禁用'}
          </span>
        </div>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(item.key, e.target.value)}
          min={item.min}
          max={item.max}
          placeholder={item.placeholder}
          className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
        />
      );

    case 'color':
      return (
        <div className="flex items-center space-x-4">
          <input
            type="color"
            value={value || '#3B82F6'}
            onChange={(e) => onChange(item.key, e.target.value)}
            className="h-12 w-20 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={value || '#3B82F6'}
            onChange={(e) => onChange(item.key, e.target.value)}
            placeholder="#3B82F6"
            className={`input flex-1 ${error ? 'border-red-500 dark:border-red-500' : ''}`}
          />
        </div>
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(item.key, e.target.value)}
          className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
        >
          {item.options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'json':
      return (
        <textarea
          value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
          onChange={(e) => onChange(item.key, e.target.value)}
          placeholder={item.placeholder}
          rows={4}
          className={`input font-mono text-sm ${error ? 'border-red-500 dark:border-red-500' : ''}`}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(item.key, e.target.value)}
          placeholder={item.placeholder}
          rows={3}
          className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
        />
      );

    case 'techstack':
      return (
        <div className="space-y-2">
          <textarea
            value={techStackInput}
            onChange={(e) => onTechStackChange(e.target.value)}
            placeholder="React + TypeScript&#10;Cloudflare Workers&#10;Tailwind CSS"
            rows={5}
            className={`input font-mono text-sm ${error ? 'border-red-500 dark:border-red-500' : ''}`}
          />
          <p className="text-xs text-muted-foreground">每行输入一个技术栈名称</p>
          {value && Array.isArray(value) && value.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {value.map((tech: string, index: number) => (
                <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    default:
      return (
        <input
          type={item.type === 'email' ? 'email' : item.type === 'url' ? 'url' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(item.key, e.target.value)}
          placeholder={item.placeholder}
          className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
        />
      );
  }
}