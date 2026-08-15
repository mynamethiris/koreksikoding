import { keymap } from '@codemirror/view';
import { acceptCompletion, closeCompletion } from '@codemirror/autocomplete';
import { indentMore, insertNewline } from '@codemirror/commands';

export const editorKeymap = keymap.of([
  {
    key: 'Tab',
    run: (view) => {
      if (acceptCompletion(view)) return true;
      return indentMore(view);
    },
  },
  {
    key: 'Enter',
    run: (view) => {
      closeCompletion(view);
      return insertNewline(view);
    },
  },
]);
