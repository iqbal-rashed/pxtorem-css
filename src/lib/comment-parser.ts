import type { Comment, ChildNode } from 'postcss';

/**
 * Check if a comment contains a specific pattern
 */
function commentContains(comment: Comment, pattern: string): boolean {
  return comment.text.trim().toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Get the previous sibling node
 */
function getPreviousSibling(node: ChildNode): ChildNode | undefined {
  if (!node.parent) return undefined;
  const index = node.parent.index(node);
  if (index <= 0) return undefined;
  return node.parent.nodes?.[index - 1];
}

/**
 * Check if conversion is disabled for a declaration
 */
export function isConversionDisabled(
  node: ChildNode,
  disableNextLineComment: string,
  disableLineComment: string,
  disableComment: string,
  enableComment: string
): boolean {
  // Check for inline comment on same line (pxtorem-disable-line)
  const nodeSource = node.source;
  if (nodeSource?.input?.css) {
    const lines = nodeSource.input.css.split('\n');
    const lineIndex = (nodeSource.start?.line ?? 1) - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      if (
        line.includes(`/*`) &&
        line.toLowerCase().includes(disableLineComment.toLowerCase())
      ) {
        return true;
      }
    }
  }

  // Check for previous sibling comment (pxtorem-disable-next-line)
  const prevSibling = getPreviousSibling(node);
  if (prevSibling?.type === 'comment') {
    if (commentContains(prevSibling as Comment, disableNextLineComment)) {
      return true;
    }
  }

  // Check for block-level disable (pxtorem-disable / pxtorem-enable)
  let current: ChildNode | undefined = node;
  let isDisabled = false;

  while (current?.parent) {
    const parent = current.parent;
    const index = parent.index(current);

    // Check all previous siblings for disable/enable comments
    for (let i = index - 1; i >= 0; i--) {
      const sibling = parent.nodes?.[i];
      if (sibling?.type === 'comment') {
        const comment = sibling as Comment;
        if (commentContains(comment, enableComment)) {
          isDisabled = false;
          break;
        }
        if (commentContains(comment, disableComment)) {
          isDisabled = true;
          break;
        }
      }
    }

    if (isDisabled) return true;
    current = parent as ChildNode;
  }

  return isDisabled;
}
