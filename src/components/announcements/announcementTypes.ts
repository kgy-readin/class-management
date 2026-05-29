export interface DocTab {
  id: string;
  title: string;
  text: string;
  childTabs: DocTab[];
}

export interface Block {
  type: 'h1' | 'h2' | 'hr' | 'empty' | 'bullet' | 'p' | 'callout';
  text?: string;
  children?: Block[];
}
