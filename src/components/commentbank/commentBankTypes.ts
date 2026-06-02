export interface Block {
  type: 'callout' | 'hr' | 'h1' | 'h2' | 'bullet' | 'empty' | 'p';
  text?: string;
  children?: Block[];
}

export interface DocTab {
  id: string;
  title: string;
  text?: string;
  childTabs?: DocTab[];
  isFolder?: boolean;
}
