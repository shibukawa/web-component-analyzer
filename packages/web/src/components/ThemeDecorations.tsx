import { useTheme } from '../contexts/ThemeContext';
import type { DecorationType } from '../types/theme';
import './ThemeDecorations.css';

const decorationIcons: Record<DecorationType, string> = {
  bat: '🦇',
  pumpkin: '🎃',
  mummy: '🧟',
  zombie: '🧟‍♂️',
  vampire: '🧛',
  egg: '🥚',
  bunny: '🐰',
};

export function ThemeDecorations() {
  const { theme } = useTheme();

  if (!theme.decorations.enabled) {
    return null;
  }

  return (
    <div className="theme-decorations">
      {theme.decorations.elements.map((element, index) => (
        <div
          key={`${element.type}-${index}`}
          className={`decoration decoration-${element.type} decoration-${element.size}`}
          style={{
            left: `${element.position.x}%`,
            top: `${element.position.y}%`,
          }}
          aria-hidden="true"
        >
          {decorationIcons[element.type]}
        </div>
      ))}
    </div>
  );
}
