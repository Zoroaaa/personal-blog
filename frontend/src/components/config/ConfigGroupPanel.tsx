/**
 * 单个配置分组面板
 *
 * 渲染分组标题、描述与组内所有配置项（标签、实时预览徽标、
 * 单项保存按钮、输入控件与校验错误）。
 */

import type { ConfigGroup } from './configSchema';
import { ConfigInput } from './ConfigInput';

interface ConfigGroupPanelProps {
  group: ConfigGroup;
  active: boolean;
  localConfig: Record<string, any>;
  errors: Record<string, string>;
  updating: string | null;
  techStackInput: string;
  onChange: (key: string, value: any) => void;
  onTechStackChange: (value: string) => void;
  onSave: (key: string, value: any) => void;
}

export function ConfigGroupPanel({
  group,
  active,
  localConfig,
  errors,
  updating,
  techStackInput,
  onChange,
  onTechStackChange,
  onSave,
}: ConfigGroupPanelProps) {
  return (
    <div
      className={`card p-6 ${active ? 'block' : 'hidden'}`}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">{group.title}</h2>
        {group.description && (
          <p className="text-muted-foreground">{group.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {group.items.map((item, itemIndex) => (
          <div key={itemIndex} className="border-b border-border pb-6 last:border-0 last:pb-0">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-3">
              <div className="flex-1">
                <label className="font-medium text-foreground flex items-center gap-2">
                  {item.label}
                  {item.preview && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      实时预览
                    </span>
                  )}
                </label>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                )}
              </div>

              {!item.preview && (
                <button
                  onClick={() => onSave(item.key, localConfig[item.key])}
                  className="btn btn-primary px-4 py-2 shrink-0"
                  disabled={updating === item.key || updating === 'batch'}
                >
                  {updating === item.key ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      保存中...
                    </span>
                  ) : (
                    '保存'
                  )}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <ConfigInput
                item={item}
                value={localConfig[item.key]}
                error={errors[item.key]}
                techStackInput={techStackInput}
                onChange={onChange}
                onTechStackChange={onTechStackChange}
              />
              {errors[item.key] && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors[item.key]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}