/**
 * 配置页标签页导航
 */

import type { ConfigGroup } from './configSchema';

interface ConfigTabsProps {
  groups: ConfigGroup[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export function ConfigTabs({ groups, activeTab, onTabChange }: ConfigTabsProps) {
  return (
    <div className="mb-6 border-b border-border">
      <div className="flex flex-wrap gap-2">
        {groups.map((group, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === index
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="mr-2">{group.icon}</span>
            {group.title}
          </button>
        ))}
      </div>
    </div>
  );
}