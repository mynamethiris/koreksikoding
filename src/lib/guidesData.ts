import {
  Lightbulb,
  GitBranch,
  Wand2,
  Terminal,
  Monitor,
  Bug,
  ShieldCheck,
  Package,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface GuideItem {
  id: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  titleKey: string;
  descKey: string;
  itemsKey: string;
  detailKey: string;
  color: string;
  bg: string;
}

export const GUIDES: GuideItem[] = [
  {
    id: 'logic',
    icon: Lightbulb,
    titleKey: 'guides.logic.title',
    descKey: 'guides.logic.desc',
    itemsKey: 'guides.logic.items',
    detailKey: 'guides.logic.detail',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'debugging',
    icon: Bug,
    titleKey: 'guides.debugging.title',
    descKey: 'guides.debugging.desc',
    itemsKey: 'guides.debugging.items',
    detailKey: 'guides.debugging.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'ide',
    icon: Monitor,
    titleKey: 'guides.ide.title',
    descKey: 'guides.ide.desc',
    itemsKey: 'guides.ide.items',
    detailKey: 'guides.ide.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'git',
    icon: GitBranch,
    titleKey: 'guides.git.title',
    descKey: 'guides.git.desc',
    itemsKey: 'guides.git.items',
    detailKey: 'guides.git.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'prompt',
    icon: Wand2,
    titleKey: 'guides.prompt.title',
    descKey: 'guides.prompt.desc',
    itemsKey: 'guides.prompt.items',
    detailKey: 'guides.prompt.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'linux',
    icon: Terminal,
    titleKey: 'guides.linux.title',
    descKey: 'guides.linux.desc',
    itemsKey: 'guides.linux.items',
    detailKey: 'guides.linux.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'build',
    icon: Package,
    titleKey: 'guides.build.title',
    descKey: 'guides.build.desc',
    itemsKey: 'guides.build.items',
    detailKey: 'guides.build.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    id: 'security',
    icon: ShieldCheck,
    titleKey: 'guides.security.title',
    descKey: 'guides.security.desc',
    itemsKey: 'guides.security.items',
    detailKey: 'guides.security.detail',
      color: 'text-accent',
    bg: 'bg-accent/10',
  },
];
