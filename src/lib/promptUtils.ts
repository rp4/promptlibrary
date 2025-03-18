export function extractVariables(promptText: string): string[] {
  const matches = promptText.match(/\[\[(.*?)\]\]/g) || [];
  return matches.map(match => match.slice(2, -2));
}

export function replaceVariables(promptText: string, variables: Record<string, string>): string {
  return promptText.replace(/\[\[(.*?)\]\]/g, (match, variable) => {
    return variables[variable] || match;
  });
} 