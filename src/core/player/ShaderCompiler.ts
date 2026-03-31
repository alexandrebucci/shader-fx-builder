interface CompilationError {
  line: number
  message: string
  type: 'error' | 'warning'
}

export class ShaderCompiler {
  static resolveIncludes(
    source: string,
    snippets: Record<string, string> = {}
  ): string {
    return source.replace(
      /\/\/\s*#include\s+<(\w+)>/g,
      (_, name: string) => snippets[name] ?? `// ERROR: snippet "${name}" not found`
    )
  }

  static parseErrors(rawLog: string): CompilationError[] {
    if (!rawLog) return []
    const errors: CompilationError[] = []
    const lineRegex = /ERROR:\s*\d+:(\d+):\s*(.+)/g
    let match: RegExpExecArray | null
    while ((match = lineRegex.exec(rawLog)) !== null) {
      errors.push({
        line: parseInt(match[1], 10),
        message: match[2].trim(),
        type: 'error',
      })
    }
    return errors
  }
}
