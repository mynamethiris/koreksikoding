import { githubLightInit } from '@uiw/codemirror-theme-github';
import { tokyoNightInit } from '@uiw/codemirror-theme-tokyo-night';

export const lightTheme = githubLightInit({
  settings: {
    selection: '#b4530970',
    selectionMatch: '#b4530930',
  },
});

export const darkTheme = tokyoNightInit({
  settings: {
    selection: '#d9770690',
    selectionMatch: '#d9770640',
  },
});
